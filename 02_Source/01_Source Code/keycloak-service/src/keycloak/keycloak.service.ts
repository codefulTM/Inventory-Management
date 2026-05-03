/**
 * File: keycloak.service.ts
 * Mô tả: Service đóng vai trò cầu nối giữa ứng dụng và Keycloak Identity Provider.
 *
 * Chức năng chính:
 * - Xác thực admin để gọi Keycloak Admin REST API (getAdminToken)
 * - Đăng nhập user thông qua OAuth2 password grant (loginUser)
 * - Quản lý user: tạo, cập nhật, xóa, đặt lại mật khẩu
 * - Quản lý roles: gán realm roles cho user
 * - Token management: refresh, logout, introspect
 *
 * Cấu hình thông qua environment variables:
 * - KEYCLOAK_SERVER_URL: URL của Keycloak server (mặc định: http://localhost:8080)
 * - KEYCLOAK_REALM: Tên realm (mặc định: inventory)
 * - KEYCLOAK_ADMIN_CLIENT_ID/SECRET: Credentials cho admin operations
 * - KEYCLOAK_LOGIN_CLIENT_ID/SECRET: Credentials cho user login (Direct Access Grants)
 *
 * Luồng xác thực admin:
 * - Nếu có admin user/password → dùng password grant với master realm (admin-cli)
 * - Nếu không → dùng client_credentials grant với current realm
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Interface: Phản hồi từ Keycloak token endpoint
 */
export interface KeycloakTokenResponse {
  access_token: string;        // JWT access token
  expires_in: number;          // Thời gian hết hạn (giây)
  refresh_expires_in: number;   // Thời gian hết hạn của refresh token
  refresh_token: string;        // Refresh token để làm mới access token
  token_type: string;           // Loại token (thường là "bearer")
  session_state: string;        // Trạng thái phiên làm việc
  scope: string;                // Phạm vi của token
}

/**
 * Interface: Thông tin user từ Keycloak Admin API
 */
export interface KeycloakUserRepresentation {
  id: string;                           // Keycloak user ID (UUID)
  username: string;                      // Tên đăng nhập
  email: string;                         // Email
  firstName?: string;                    // Tên
  lastName?: string;                     // Họ
  enabled: boolean;                      // Tài khoản có được kích hoạt không
  emailVerified?: boolean;               // Email đã được xác thực chưa
  attributes?: Record<string, string[]>; // Thuộc tính tùy chỉnh (vd: role)
  realmRoles?: string[];                 // Realm roles
  clientRoles?: Record<string, string[]>; // Client roles
  credentials?: Array<{                  // Thông tin xác thực
    type: string;
    value: string;
    temporary: boolean;
  }>;
  requiredActions?: string[];            // Các hành động yêu cầu (vd: đổi mật khẩu)
}

/**
 * Interface: JWT payload từ Keycloak (dùng để xác thực token)
 */
export interface KeycloakJwtPayload {
  sub: string;                           // User ID (subject)
  preferred_username?: string;            // Tên đăng nhập ưa thích
  username?: string;                      // Tên đăng nhập
  email?: string;                         // Email
  realm_access?: { roles: string[] };    // Realm roles
  resource_access?: Record<string, { roles: string[] }>; // Client roles
  exp: number;                           // Thời điểm hết hạn
  iat: number;                           // Thời điểm phát hành
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  // Cấu hình Keycloak từ environment variables
  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private readonly adminUser: string;
  private readonly adminPassword: string;
  private readonly clientId: string;
  private readonly loginClientId: string;
  private readonly loginClientSecret: string;

  // Cache admin token để tránh gọi lại nhiều lần
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
    this.adminUser = this.config.get<string>('KEYCLOAK_ADMIN_USER', '');
    this.adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD', '');
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

  /** URL của realm hiện tại */
  get realmUrl(): string {
    return `${this.serverUrl}/realms/${this.realm}`;
  }

  /** Base URL cho Keycloak Admin API */
  get adminBaseUrl(): string {
    return `${this.serverUrl}/admin/realms/${this.realm}`;
  }

  /** Token endpoint cho việc xác thực user (password grant) */
  get tokenEndpoint(): string {
    return `${this.realmUrl}/protocol/openid-connect/token`;
  }

  /** Token endpoint cho master realm (dùng cho admin user login) */
  get masterTokenEndpoint(): string {
    return `${this.serverUrl}/realms/master/protocol/openid-connect/token`;
  }

  /** JWKS URI để lấy public keys xác thực JWT */
  get jwksUri(): string {
    return `${this.realmUrl}/protocol/openid-connect/certs`;
  }

  /**
   * Lấy admin access token để gọi Keycloak Admin REST API
   * Sử dụng cache: chỉ gọi lại khi token sắp hết hạn (còn < 60 giây)
   */
  async getAdminToken(): Promise<string> {
    const now = Date.now();

    // ─── BƯỚC 1: KIỂM TRA CACHE ───────────────────────────────────────
    // Nếu đã có token và còn hạn ít nhất 60 giây nữa → dùng token cũ
    // (Tránh gọi Keycloak quá nhiều lần gây quá tải)
    if (this.adminToken && this.adminTokenExpiry > now + 60_000) {
      return this.adminToken;
    }

    // ─── BƯỚC 2: CHUẨN BỊ DỮ LIỆU GỬI ĐI ─────────────────────────
    const body = new URLSearchParams();

    // Hai cách lấy admin token khác nhau:
    if (this.adminUser && this.adminPassword) {
      // CÁCH 1: Dùng tài khoản admin (sống trong master realm)
      // → Có quyền cao nhất, nhưng cần username/password
      body.set('grant_type', 'password');           // OAuth2 password grant
      body.set('client_id', 'admin-cli');           // Public client của Keycloak (không cần secret)
      body.set('username', this.adminUser);         // Admin username
      body.set('password', this.adminPassword);     // Admin password
    } else {
      // CÁCH 2: Dùng Service Account (Client Credentials)
      // → Không cần user/password, nhưng quyền hạn chế hơn
      body.set('grant_type', 'client_credentials');  // OAuth2 client_credentials grant
      body.set('client_id', this.adminClientId);     // Client ID đã đăng ký
      body.set('client_secret', this.adminClientSecret); // Client Secret (như mật khẩu của app)
    }

    // ─── BƯỚC 3: CHỌN ENDPOINT ĐÚNG ─────────────────────────────────
    const usePasswordGrant = !!(this.adminUser && this.adminPassword);
    const endpoint = usePasswordGrant
      ? this.masterTokenEndpoint  // → https://keycloak/realms/master/protocol/openid-connect/token
      : this.tokenEndpoint;       // → https://keycloak/realms/inventory/protocol/openid-connect/token

    try {
      // ─── BƯỚC 4: GỌI KEYCLOAK LẤY TOKEN ─────────────────────────
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),  // URL-encoded: grant_type=password&client_id=admin-cli&...
      });

      // ─── BƯỚC 5: KIỂM TRA KẾT QUẢ ──────────────────────────────
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Failed to get admin token: ${res.status} ${text}`);
        throw new InternalServerErrorException(
          'Keycloak admin authentication failed',
        );
      }

      // ─── BƯỚC 6: LƯU TOKEN VÀO CACHE ───────────────────────────
      const data = (await res.json()) as KeycloakTokenResponse;
      this.adminToken = data.access_token;                    // Lưu token
      this.adminTokenExpiry = now + data.expires_in * 1000;  // Tính thời điểm hết hạn (ms)
      return this.adminToken;

    } catch (error) {
      // ─── BƯỚC 7: XỬ LÝ LỖI ─────────────────────────────────────
      if (error instanceof InternalServerErrorException) {
        throw error;  // Lỗi đã biết, ném lại
      }
      this.logger.error('Keycloak connection error', error as Error);
      throw new InternalServerErrorException('Cannot connect to Keycloak');
    }
  }

  /**
   * Đăng nhập user qua Keycloak (password grant)
   * @param username - Tên đăng nhập
   * @param password - Mật khẩu
   * @returns KeycloakTokenResponse chứa access_token, refresh_token, etc.
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
            `Cấu hình Keycloak client không hợp lệ (client_id=${this.loginClientId}). Kiểm tra KEYCLOAK_LOGIN_CLIENT_ID/KEYCLOAK_LOGIN_CLIENT_SECRET và bật Direct Access Grants trong Keycloak client.`,
          );
        }

        if (parsed.error === 'invalid_grant') {
          throw new UnauthorizedException(
            'Tên đăng nhập hoặc mật khẩu không đúng',
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
   * Làm mới access_token bằng refresh_token
   * @param refreshToken - Refresh token từ client
   * @returns KeycloakTokenResponse mới
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
   * Đăng xuất - thu hồi refresh_token tại Keycloak
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
   * Tạo user mới trong Keycloak
   * @param data - Thông tin user (username, email, password, role)
   * @returns Keycloak user ID (UUID)
   *
   * Quy trình:
   * 1. Gọi Admin API để tạo user
   * 2. Lấy user ID từ header Location trong response
   * 3. Gán realm role cho user
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
   * @param keycloakId - ID của user trong Keycloak
   * @param data - Thông tin cần cập nhật (email, role, firstName, lastName)
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

    // Lấy thông tin hiện tại của user trước khi cập nhật
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
   * Kích hoạt hoặc vô hiệu hóa user trong Keycloak
   * @param keycloakId - ID của user
   * @param enabled - true = kích hoạt, false = vô hiệu hóa
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
   * @param keycloakId - ID của user
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

    // Cập nhật user để trigger any necessary side effects
    await this.updateUser(keycloakId, {});
  }

  /**
   * Xóa user khỏi Keycloak
   * @param keycloakId - ID của user cần xóa
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
   * Tìm user trong Keycloak theo username
   * @param username - Tên đăng nhập cần tìm
   * @returns KeycloakUserRepresentation hoặc null nếu không tìm thấy
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
   * @param keycloakId - ID của user
   * @param roleName - Tên role cần gán
   */
  async assignRealmRole(keycloakId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();

      // Lấy thông tin role từ Keycloak
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

      // Gán role cho user
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
   * Lấy danh sách realm roles của user từ Keycloak
   * @param keycloakId - ID của user
   * @returns Danh sách role names
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
   * Kiểm tra tính hợp lệ của access token (introspect)
   * @param accessToken - Access token cần kiểm tra
   * @returns Object chứa thông tin token (active, sub, preferred_username)
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
