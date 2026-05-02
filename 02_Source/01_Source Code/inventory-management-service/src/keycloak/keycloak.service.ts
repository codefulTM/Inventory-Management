/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * KeycloakService - Dịch vụ tương tác với Keycloak Identity Provider
 *
 * Chức năng chính:
 * - Xác thực user (login, refresh token, logout)
 * - Quản lý user qua Keycloak Admin REST API (create, update, delete, reset password)
 * - Quản lý role (assign role, get roles for user)
 * - Introspect token để kiểm tra tính hợp lệ
 *
 * Cơ chế:
 * - Sử dụng fetch() để gọi trực tiếp Keycloak REST API
 * - Tự động quản lý admin token (lưu cache, tự động refresh khi gần hết hạn)
 * - Hỗ trợ cả confidential client (có client_secret) và public client
 *
 * Cấu hình yêu cầu (trong .env):
 * - KEYCLOAK_SERVER_URL: URL của Keycloak server
 * - KEYCLOAK_REALM: Tên realm (mặc định: inventory)
 * - KEYCLOAK_ADMIN_CLIENT_ID / KEYCLOAK_ADMIN_CLIENT_SECRET: Client admin để gọi Admin API
 * - KEYCLOAK_LOGIN_CLIENT_ID / KEYCLOAK_LOGIN_CLIENT_SECRET: Client dùng cho login
 */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  session_state: string;
  scope: string;
}

export interface KeycloakUserRepresentation {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
  credentials?: Array<{
    type: string;
    value: string;
    temporary: boolean;
  }>;
  requiredActions?: string[];
}

export interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  username?: string;
  email?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private readonly clientId: string;
  private readonly loginClientId: string;
  private readonly loginClientSecret: string;

  private adminToken: string | null = null;
  private adminTokenExpiry = 0;

  constructor(private readonly config: ConfigService) {
    this.serverUrl = this.config.get<string>(
      'KEYCLOAK_SERVER_URL',
      'http://localhost:8080',
    );
    this.realm = this.config.get<string>('KEYCLOAK_REALM', 'inventory');
    this.adminClientId = this.config.get<string>(
      'KEYCLOAK_ADMIN_CLIENT_ID',
      'admin-cli',
    );
    this.adminClientSecret = this.config.get<string>(
      'KEYCLOAK_ADMIN_CLIENT_SECRET',
      '',
    );
    this.clientId = this.config.get<string>(
      'KEYCLOAK_CLIENT_ID',
      'inventory-backend',
    );
    this.loginClientId = this.config.get<string>(
      'KEYCLOAK_LOGIN_CLIENT_ID',
      this.clientId,
    );
    this.loginClientSecret = this.config.get<string>(
      'KEYCLOAK_LOGIN_CLIENT_SECRET',
      this.config.get<string>('KEYCLOAK_CLIENT_SECRET', ''),
    );
  }

  get realmUrl(): string {
    return `${this.serverUrl}/realms/${this.realm}`;
  }

  get adminBaseUrl(): string {
    return `${this.serverUrl}/admin/realms/${this.realm}`;
  }

  get tokenEndpoint(): string {
    return `${this.realmUrl}/protocol/openid-connect/token`;
  }

  get jwksUri(): string {
    return `${this.realmUrl}/protocol/openid-connect/certs`;
  }

  /**
   * Lấy admin token để gọi Keycloak Admin API
   * Tự động cache token và refresh khi gần hết hạn (trước 60 giây)
   * Sử dụng OAuth2 client_credentials grant
   */
  async getAdminToken(): Promise<string> {
    const now = Date.now();
    if (this.adminToken && this.adminTokenExpiry > now + 60_000) {
      return this.adminToken;
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', this.adminClientId);
    body.set('client_secret', this.adminClientSecret);

    try {
      const res = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Failed to get admin token: ${res.status} ${text}`);
        throw new InternalServerErrorException(
          'Keycloak admin authentication failed',
        );
      }

      const data = (await res.json()) as KeycloakTokenResponse;
      this.adminToken = data.access_token;
      this.adminTokenExpiry = now + data.expires_in * 1000;
      return this.adminToken;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error('Keycloak connection error', error as Error);
      throw new InternalServerErrorException('Cannot connect to Keycloak');
    }
  }

  /**
   * Đăng nhập user qua Keycloak (Resource Owner Password Credentials grant)
   * @param username - Tên đăng nhập
   * @param password - Mật khẩu
   * @returns Token set (access_token, refresh_token, expires_in...)
   */
  async loginUser(
    username: string,
    password: string,
  ): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', this.loginClientId);
    body.set('username', username);
    body.set('password', password);

    if (this.loginClientSecret) {
      body.set('client_secret', this.loginClientSecret);
    }

    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Login failed for ${username}: ${res.status} ${text}`);

      try {
        const parsed = JSON.parse(text) as {
          error?: string;
          error_description?: string;
        };

        if (
          parsed.error === 'unauthorized_client' ||
          parsed.error === 'invalid_client'
        ) {
          throw new InternalServerErrorException(
            `Cau hinh Keycloak client khong hop le (client_id=${this.loginClientId}). Kiem tra KEYCLOAK_LOGIN_CLIENT_ID/KEYCLOAK_LOGIN_CLIENT_SECRET va bat Direct Access Grants trong Keycloak client.`,
          );
        }

        if (parsed.error === 'invalid_grant') {
          throw new UnauthorizedException(
            'Ten dang nhap hoac mat khau khong dung',
          );
        }
      } catch (error) {
        if (
          error instanceof UnauthorizedException ||
          error instanceof InternalServerErrorException
        ) {
          throw error;
        }
      }

      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return res.json() as Promise<KeycloakTokenResponse>;
  }

  /**
   * Làm mới access token bằng refresh token
   * @param refreshToken - Refresh token hiện tại
   * @returns Token set mới
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', this.loginClientId);
    body.set('refresh_token', refreshToken);

    if (this.loginClientSecret) {
      body.set('client_secret', this.loginClientSecret);
    }

    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    return res.json() as Promise<KeycloakTokenResponse>;
  }

  /**
   * Đăng xuất user — thu hồi refresh token tại Keycloak
   * @param refreshToken - Refresh token cần thu hồi
   */
  async logoutUser(refreshToken: string): Promise<void> {
    const logoutUrl = `${this.realmUrl}/protocol/openid-connect/logout`;
    const body = new URLSearchParams();
    body.set('client_id', this.loginClientId);
    body.set('refresh_token', refreshToken);

    if (this.loginClientSecret) {
      body.set('client_secret', this.loginClientSecret);
    }

    await fetch(logoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  /**
   * Tạo user mới trong Keycloak và gán role
   * @param data - Thông tin user (username, email, password, role)
   * @returns Keycloak ID của user mới tạo
   */
  async createUser(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
  }): Promise<string> {
    const token = await this.getAdminToken();

    const body: Partial<KeycloakUserRepresentation> = {
      username: data.username,
      email: data.email,
      enabled: true,
      emailVerified: true,
      firstName: data.firstName || data.username,
      lastName: data.lastName || data.username,
      credentials: [
        { type: 'password', value: data.password, temporary: false },
      ],
      requiredActions: [],
      attributes: {
        role: [data.role],
      },
    };

    const res = await fetch(`${this.adminBaseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Create user failed: ${res.status} ${text}`);
      if (res.status === 409) {
        throw new InternalServerErrorException(
          'User đã tồn tại trong Keycloak',
        );
      }

      throw new InternalServerErrorException(
        'Không thể tạo user trong Keycloak',
      );
    }

    const location = res.headers.get('Location') ?? '';
    const keycloakId = location.split('/').pop() ?? '';

    if (!keycloakId) {
      throw new InternalServerErrorException('Không lấy được Keycloak user ID');
    }

    await this.assignRealmRole(keycloakId, data.role);

    this.logger.log(`Created Keycloak user: ${data.username} (${keycloakId})`);
    return keycloakId;
  }

  /**
   * Cập nhật thông tin user trong Keycloak
   * Đọc thông tin hiện tại trước rồi merge với dữ liệu mới để tránh ghi đè
   * @param keycloakId - ID của user trong Keycloak
   * @param data - Các trường cần cập nhật (email, role, firstName, lastName)
   */
  async updateUser(
    keycloakId: string,
    data: {
      email?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<void> {
    const token = await this.getAdminToken();

    const existingResponse = await fetch(
      `${this.adminBaseUrl}/users/${keycloakId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!existingResponse.ok) {
      const text = await existingResponse.text();
      this.logger.error(
        `Get user ${keycloakId} failed: ${existingResponse.status} ${text}`,
      );
      throw new InternalServerErrorException(
        'Không thể đọc user từ Keycloak trước khi cập nhật',
      );
    }

    const existing =
      (await existingResponse.json()) as Partial<KeycloakUserRepresentation>;

    const body: Partial<KeycloakUserRepresentation> = {
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      emailVerified: existing.emailVerified ?? true,
      requiredActions: [],
    };

    if (data.email) {
      body.email = data.email;
      body.emailVerified = true;
    }

    if (data.firstName !== undefined) {
      body.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      body.lastName = data.lastName;
    }

    if (data.role) {
      body.attributes = { role: [data.role] };
    }

    const updateResponse = await fetch(
      `${this.adminBaseUrl}/users/${keycloakId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      this.logger.error(
        `Update user ${keycloakId} failed: ${updateResponse.status} ${text}`,
      );
      throw new InternalServerErrorException(
        'Không thể cập nhật user trong Keycloak',
      );
    }

    if (data.role) {
      await this.assignRealmRole(keycloakId, data.role);
    }
  }

  /**
   * Bật/vô hiệu hóa user trong Keycloak
   * Vô hiệu hóa sẽ ngay lập tức thu hồi phiên đăng nhập của user
   * @param keycloakId - ID của user trong Keycloak
   * @param enabled - Trạng thái bật/tắt
   */
  async setUserEnabled(keycloakId: string, enabled: boolean): Promise<void> {
    const token = await this.getAdminToken();

    const res = await fetch(`${this.adminBaseUrl}/users/${keycloakId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Set user enabled failed: ${res.status} ${text}`);
      throw new InternalServerErrorException(
        'Không thể thay đổi trạng thái user trong Keycloak',
      );
    }
  }

  /**
   * Đặt lại mật khẩu cho user trong Keycloak
   * @param keycloakId - ID của user trong Keycloak
   * @param newPassword - Mật khẩu mới
   */
  async resetPassword(keycloakId: string, newPassword: string): Promise<void> {
    const token = await this.getAdminToken();

    const res = await fetch(
      `${this.adminBaseUrl}/users/${keycloakId}/reset-password`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'password',
          value: newPassword,
          temporary: false,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Reset password failed: ${res.status} ${text}`);
      throw new InternalServerErrorException(
        'Không thể đặt lại mật khẩu trong Keycloak',
      );
    }

    await this.updateUser(keycloakId, {});
  }

  /**
   * Xóa user khỏi Keycloak
   * @param keycloakId - ID của user trong Keycloak
   */
  async deleteUser(keycloakId: string): Promise<void> {
    const token = await this.getAdminToken();

    const res = await fetch(`${this.adminBaseUrl}/users/${keycloakId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      this.logger.error(
        `Delete user ${keycloakId} failed: ${res.status} ${text}`,
      );
      throw new InternalServerErrorException(
        'Không thể xóa user khỏi Keycloak',
      );
    }
  }

  /**
   * Tìm user trong Keycloak theo username (exact match)
   * @param username - Tên đăng nhập cần tìm
   * @returns Thông tin user hoặc null nếu không tìm thấy
   */
  async findKeycloakUserByUsername(
    username: string,
  ): Promise<KeycloakUserRepresentation | null> {
    const token = await this.getAdminToken();

    const res = await fetch(
      `${this.adminBaseUrl}/users?username=${encodeURIComponent(username)}&exact=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      return null;
    }

    const users = (await res.json()) as KeycloakUserRepresentation[];
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Gán realm role cho user trong Keycloak
   * Nếu role không tồn tại trong realm, bỏ qua silently
   * @param keycloakId - ID của user trong Keycloak
   * @param roleName - Tên role cần gán
   */
  async assignRealmRole(keycloakId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();

      const roleRes = await fetch(
        `${this.adminBaseUrl}/roles/${encodeURIComponent(roleName)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!roleRes.ok) {
        this.logger.warn(
          `Role '${roleName}' not found in Keycloak realm, skipping assignment`,
        );
        return;
      }

      const role = await roleRes.json();

      await fetch(
        `${this.adminBaseUrl}/users/${keycloakId}/role-mappings/realm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify([role]),
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to assign role ${roleName} to ${keycloakId}:`,
        error as Error,
      );
    }
  }

  /**
   * Lấy danh sách realm roles của một user
   * @param keycloakId - ID của user trong Keycloak
   * @returns Danh sách tên roles
   */
  async getRealmRolesForUser(keycloakId: string): Promise<string[]> {
    const token = await this.getAdminToken();
    const res = await fetch(
      `${this.adminBaseUrl}/users/${keycloakId}/role-mappings/realm`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      return [];
    }

    const roles = (await res.json()) as Array<{ name?: string }>;
    return roles
      .map((role) => role.name)
      .filter((name): name is string => typeof name === 'string');
  }

  /**
   * Introspect access token để kiểm tra tính hợp lệ
   * Sử dụng Keycloak Token Introspection Endpoint
   * @param accessToken - Access token cần kiểm tra
   * @returns Trạng thái active và thông tin user nếu token hợp lệ
   */
  async introspectToken(
    accessToken: string,
  ): Promise<{ active: boolean; sub?: string; preferred_username?: string }> {
    const body = new URLSearchParams();
    body.set('token', accessToken);
    body.set('client_id', this.loginClientId);

    if (this.loginClientSecret) {
      body.set('client_secret', this.loginClientSecret);
    }

    const introspectUrl = `${this.realmUrl}/protocol/openid-connect/token/introspect`;

    const res = await fetch(introspectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      return { active: false };
    }

    return res.json() as Promise<{
      active: boolean;
      sub?: string;
      preferred_username?: string;
    }>;
  }
}
