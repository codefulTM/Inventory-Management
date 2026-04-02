import {
  Injectable,
  Logger,
  InternalServerErrorException,
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
  id: string; // Keycloak UUID
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
  sub: string; // Keycloak user ID
  preferred_username: string;
  email: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
}

/**
 * KeycloakService
 * Cung cấp các thao tác với Keycloak Admin REST API và token validation.
 *
 * Chiến lược:
 *   1. Login / Register: đồng bộ user giữa MongoDB ↔ Keycloak
 *   2. Token validation: verify JWT bằng JWKS endpoint của Keycloak
 *   3. Admin operations: tạo/cập nhật/khóa user qua Admin REST API
 */
@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  private readonly serverUrl: string;
  private readonly realm: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private readonly clientId: string;

  // Cache admin token
  private adminToken: string | null = null;
  private adminTokenExpiry: number = 0;

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
  }

  // ─── Base URL helpers ────────────────────────────────────────────────────

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

  // ─── Admin Token ─────────────────────────────────────────────────────────

  /**
   * Lấy admin access token từ Keycloak (cache 60s buffer trước khi hết hạn)
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
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error('Keycloak connection error', err);
      throw new InternalServerErrorException('Cannot connect to Keycloak');
    }
  }

  // ─── User Login (Resource Owner Password Grant) ──────────────────────────

  /**
   * Đăng nhập user bằng username/password qua Keycloak.
   * Trả về token set (access_token, refresh_token, …)
   */
  async loginUser(
    username: string,
    password: string,
  ): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', this.clientId);
    body.set('username', username);
    body.set('password', password);

    const clientSecret = this.config.get<string>('KEYCLOAK_CLIENT_SECRET', '');
    if (clientSecret) body.set('client_secret', clientSecret);

    const res = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Login failed for ${username}: ${res.status} ${text}`);
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return res.json() as Promise<KeycloakTokenResponse>;
  }

  /**
   * Refresh access token bằng refresh_token
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', this.clientId);
    body.set('refresh_token', refreshToken);

    const clientSecret = this.config.get<string>('KEYCLOAK_CLIENT_SECRET', '');
    if (clientSecret) body.set('client_secret', clientSecret);

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
   * Logout — revoke token tại Keycloak
   */
  async logoutUser(refreshToken: string): Promise<void> {
    const logoutUrl = `${this.realmUrl}/protocol/openid-connect/logout`;
    const body = new URLSearchParams();
    body.set('client_id', this.clientId);
    body.set('refresh_token', refreshToken);

    const clientSecret = this.config.get<string>('KEYCLOAK_CLIENT_SECRET', '');
    if (clientSecret) body.set('client_secret', clientSecret);

    await fetch(logoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  // ─── Admin User CRUD ─────────────────────────────────────────────────────

  /**
   * Tạo user mới trong Keycloak.
   * Trả về keycloak_id (UUID từ Keycloak).
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

    const body: KeycloakUserRepresentation = {
      id: '',
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

    // Keycloak trả về Location header: /admin/realms/{realm}/users/{id}
    const location = res.headers.get('Location') ?? '';
    const keycloakId = location.split('/').pop() ?? '';

    if (!keycloakId) {
      throw new InternalServerErrorException('Không lấy được Keycloak user ID');
    }

    // Gán realm role
    await this.assignRealmRole(keycloakId, data.role);

    this.logger.log(`Created Keycloak user: ${data.username} (${keycloakId})`);
    return keycloakId;
  }

  /**
   * Cập nhật thông tin user trong Keycloak
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

    // GET current user để giữ lại firstName/lastName (tránh Keycloak xóa chúng)
    const existing = await fetch(`${this.adminBaseUrl}/users/${keycloakId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

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
    if (data.firstName !== undefined) body.firstName = data.firstName;
    if (data.lastName !== undefined) body.lastName = data.lastName;
    if (data.role) body.attributes = { role: [data.role] };

    const res = await fetch(`${this.adminBaseUrl}/users/${keycloakId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `Update user ${keycloakId} failed: ${res.status} ${text}`,
      );
      throw new InternalServerErrorException(
        'Không thể cập nhật user trong Keycloak',
      );
    }

    // Cập nhật role nếu có
    if (data.role) {
      await this.assignRealmRole(keycloakId, data.role);
    }
  }

  /**
   * Kích hoạt / Vô hiệu hóa user trong Keycloak
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
   * Đặt lại mật khẩu user trong Keycloak
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

    // Clear required actions (VERIFY_EMAIL, UPDATE_PASSWORD, ...) sau khi reset
    await this.updateUser(keycloakId, {});
  }

  /**
   * Xóa user khỏi Keycloak
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
   * Tìm kiếm user trong Keycloak theo username
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

    if (!res.ok) return null;

    const users = (await res.json()) as KeycloakUserRepresentation[];
    return users.length > 0 ? users[0] : null;
  }

  // ─── Realm Roles ─────────────────────────────────────────────────────────

  /**
   * Gán realm role cho user trong Keycloak.
   * Role name phải tồn tại trong realm (tạo thủ công hoặc qua migration).
   */
  async assignRealmRole(keycloakId: string, roleName: string): Promise<void> {
    try {
      const token = await this.getAdminToken();

      // Lấy role representation từ Keycloak
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
    } catch (err) {
      this.logger.warn(
        `Failed to assign role ${roleName} to ${keycloakId}:`,
        err,
      );
    }
  }

  /**
   * Lấy danh sách realm roles của user từ Keycloak
   */
  async getRealmRolesForUser(keycloakId: string): Promise<string[]> {
    const token = await this.getAdminToken();
    const res = await fetch(
      `${this.adminBaseUrl}/users/${keycloakId}/role-mappings/realm`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) return [];
    const roles = await res.json();
    return Array.isArray(roles) ? roles.map((r: any) => r.name) : [];
  }

  // ─── Token Introspection ─────────────────────────────────────────────────

  /**
   * Introspect token tại Keycloak để xác minh tính hợp lệ
   */
  async introspectToken(
    accessToken: string,
  ): Promise<{ active: boolean; sub?: string; preferred_username?: string }> {
    const body = new URLSearchParams();
    body.set('token', accessToken);
    body.set('client_id', this.clientId);

    const clientSecret = this.config.get<string>('KEYCLOAK_CLIENT_SECRET', '');
    if (clientSecret) body.set('client_secret', clientSecret);

    const introspectUrl = `${this.realmUrl}/protocol/openid-connect/token/introspect`;

    const res = await fetch(introspectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) return { active: false };

    return res.json() as Promise<{
      active: boolean;
      sub?: string;
      preferred_username?: string;
    }>;
  }
}
