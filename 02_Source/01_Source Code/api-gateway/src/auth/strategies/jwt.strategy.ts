/**
 * File: jwt.strategy.ts
 * Mô tả: JWT Strategy — xác thực JWT token sử dụng Keycloak JWKS (JSON Web Key Set)
 * Chức năng: Giải mã và validate JWT Bearer token từ header Authorization
 * 
 * Cơ chế hoạt động:
 * 1. Lấy public key từ Keycloak JWKS endpoint (/realms/{realm}/protocol/openid-connect/certs)
 * 2. Verify chữ ký JWT bằng RSA public key (thuật toán RS256)
 * 3. Kiểm tra issuer (JWT_ISSUER) để đảm bảo token được cấp bởi đúng Keycloak
 * 4. Extract thông tin user từ payload: sub, username, email, roles
 * 5. Ánh xạ realm roles sang UserRole của hệ thống
 * 6. Trả về AuthenticatedUser để gán vào req.user
 * 
 * Được sử dụng bởi JwtAuthGuard — global guard bảo vệ mọi route
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '../../schemas/user.schema';
import { buildFallbackEmail, mapRealmRolesToUserRole } from '../../utils/role-mapper';

/**
 * Interface định nghĩa cấu trúc payload của Keycloak JWT token
 * Chứa các claims tiêu chuẩn và custom claims từ Keycloak
 */
interface KeycloakJwtPayload {
  sub: string;                              // Subject — Keycloak user ID (UUID)
  preferred_username?: string;              // Username ưu tiên hiển thị
  username?: string;                        // Username (fallback)
  email?: string;                           // Email người dùng
  realm_access?: { roles: string[] };       // Danh sách realm roles
  resource_access?: Record<string, { roles: string[] }>; // Resource-specific roles
  exp: number;                              // Expiration time (unix timestamp)
  iat: number;                              // Issued at time (unix timestamp)
}

/**
 * Interface định nghĩa thông tin user đã xác thực
 * Được gán vào req.user bởi JwtStrategy sau khi validate thành công
 */
export interface AuthenticatedUser {
  keycloak_id: string;    // ID của user trong Keycloak (sub)
  username: string;       // Tên đăng nhập
  email: string;          // Email
  role: UserRole;         // Vai trò đã được ánh xạ sang UserRole
  realm_roles: string[];  // Danh sách role gốc từ Keycloak (chưa ánh xạ)
}

/**
 * JwtStrategy — validate Bearer token sử dụng Keycloak JWKS
 * 
 * Cấu hình xác thực:
 * - jwtFromRequest: Lấy token từ "Authorization: Bearer <token>"
 * - secretOrKeyProvider: Fetch public key từ Keycloak JWKS endpoint (có cache)
 * - issuer: Kiểm tra token được cấp bởi đúng Keycloak realm
 * - algorithms: Chỉ chấp nhận RS256 (RSA + SHA-256)
 * 
 * Được đăng ký với tên 'jwt' — khớp với AuthGuard('jwt') trong JwtAuthGuard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    // Lấy URL và realm của Keycloak từ biến môi trường
    const serverUrl = config.get<string>(
      'KEYCLOAK_SERVER_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');

    // Ưu tiên JWKS_URI / JWT_ISSUER từ env var; fallback tự construct từ KEYCLOAK_SERVER_URL
    // Để strategy hoạt động được cả trong Docker và môi trường local
    const jwksUri = config.get<string>(
      'JWKS_URI',
      `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`,
    );
    const issuer = config.get<string>(
      'JWT_ISSUER',
      `${serverUrl}/realms/${realm}`,
    );

    // Cấu hình Passport JWT Strategy
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy token từ "Authorization: Bearer ..."
      secretOrKeyProvider: passportJwtSecret({
        cache: true,            // Cache JWKS keys để giảm request đến Keycloak
        rateLimit: true,        // Giới hạn tần suất request
        jwksRequestsPerMinute: 5, // Tối đa 5 request/phút
        jwksUri,                // URL lấy public key
      }),
      issuer,                   // Kiểm tra token được cấp bởi đúng issuer
      algorithms: ['RS256'],    // Chỉ chấp nhận thuật toán RSA-SHA256
    });
  }

  /**
   * Phương thức validate — được Passport gọi tự động khi JWT token hợp lệ
   * 
   * Luồng xử lý:
   * 1. Kiểm tra payload có sub (Keycloak user ID) không
   * 2. Trích xuất realm roles từ payload
   * 3. Xác định username (ưu tiên preferred_username, fallback username, cuối cùng là sub)
   * 4. Xây dựng email (từ payload hoặc fallback theo pattern username@inventory.local)
   * 5. Ánh xạ realm roles sang UserRole của hệ thống
   * 6. Trả về AuthenticatedUser — được gán vào req.user
   * 
   * @param payload - JWT payload đã được giải mã và verify
   * @returns AuthenticatedUser — thông tin user đã xác thực
   * @throws UnauthorizedException nếu token không có sub
   */
  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    // Token phải có sub (Keycloak user ID) — nếu không thì không hợp lệ
    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    // Trích xuất realm roles từ JWT payload
    const realmRoles: string[] = payload.realm_access?.roles ?? [];
    this.logger.debug(`[JWT] sub=${payload.sub} preferred_username=${payload.preferred_username} realm_access=${JSON.stringify(payload.realm_access)}`);

    // Xác định username: ưu tiên preferred_username → username → sub
    const username =
      payload.preferred_username ?? payload.username ?? payload.sub;

    // Email từ payload, nếu không có thì tạo email fallback
    const email = payload.email ?? buildFallbackEmail(username);

    // Ánh xạ realm roles sang UserRole chuẩn của hệ thống
    const role = mapRealmRolesToUserRole(realmRoles, username);

    // Trả về đối tượng user đã xác thực — sẽ được gán vào req.user
    return {
      keycloak_id: payload.sub,
      username,
      email,
      role,
      realm_roles: realmRoles,
    };
  }
}
