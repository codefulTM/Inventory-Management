/**
 * JwtStrategy - Chiến lược xác thực JWT sử dụng Keycloak JWKS
 * 
 * Chức năng chính:
 * - Xác thực JWT Bearer token được cấp bởi Keycloak
 * - Sử dụng jwks-rsa để tự động lấy public key từ Keycloak (không cần lưu cứng)
 * - Cache public key để tăng hiệu năng và tránh quá tải Keycloak
 * - Map payload từ Keycloak sang định dạng AuthenticatedUser của ứng dụng
 * - Tự động gán role cho user dựa trên realm roles trong token
 * 
 * Quy trình xác thực:
 * 1. Extract JWT từ Authorization header (Bearer token)
 * 2. Lấy public key từ Keycloak JWKS endpoint
 * 3. Verify chữ ký, issuer, expiration của JWT
 * 4. Gọi method validate() để chuyển đổi payload thành user object
 * 5. Gắn user object vào request.user
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '../../schemas/user.schema';
import { UserService } from '../../user/user.service';
import {
  buildFallbackEmail,
  mapRealmRolesToUserRole,
} from './role-mapper';

/**
 * Interface định nghĩa cấu trúc payload JWT từ Keycloak
 * Chứa các claim chuẩn và custom claims từ Keycloak
 */
interface KeycloakJwtPayload {
  sub: string; // Keycloak user ID (UUID)
  preferred_username?: string; // Tên đăng nhập ưu tiên
  username?: string; // Tên đăng nhập (có thể không có)
  email?: string; // Email người dùng
  realm_access?: { roles: string[] }; // Realm roles từ Keycloak
  resource_access?: Record<string, { roles: string[] }>; // Client roles (không dùng)
  exp: number; // Thời điểm hết hạn (unix timestamp)
  iat: number; // Thời điểm phát hành token (unix timestamp)
}

/**
 * Interface định nghĩa cấu trúc user đã xác thực
 * Được gắn vào request.user sau khi xác thực thành công
 */
export interface AuthenticatedUser {
  keycloak_id: string; // UUID từ Keycloak
  username: string; // Tên đăng nhập
  email: string; // Email
  role: UserRole; // Role trong ứng dụng (đã được map)
  realm_roles: string[]; // Danh sách realm roles gốc từ Keycloak
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    // Đọc cấu hình Keycloak từ env variables
    const serverUrl = config.get<string>(
      'KEYCLOAK_SERVER_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');
    // JWKS URI - endpoint để lấy public keys từ Keycloak
    const jwksUri = config.get<string>(
      'JWKS_URI',
      `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`,
    );
    // Issuer - phải khớp với claim 'iss' trong JWT
    const issuer = config.get<string>(
      'JWT_ISSUER',
      `${serverUrl}/realms/${realm}`,
    );

    super({
      // Extract JWT từ Authorization header dạng "Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Sử dụng jwks-rsa để tự động lấy và cache public key từ Keycloak
      secretOrKeyProvider: passportJwtSecret({
        cache: true, // Cache public keys
        rateLimit: true, // Giới hạn số request đến JWKS endpoint
        jwksRequestsPerMinute: 5, // Tối đa 5 request/phút
        jwksUri,
      }),
      issuer, // Verify issuer của token
      algorithms: ['RS256'], // Thuật toán ký token (Keycloak dùng RS256)
      ignoreExpiration: false, // Không bỏ qua kiểm tra hết hạn
    });
  }

  /**
   * Được gọi sau khi JWT được verify thành công (chữ ký hợp lệ, chưa hết hạn)
   * Chuyển đổi payload Keycloak thành AuthenticatedUser
   * 
   * @param payload - Payload đã được decode từ JWT
   * @returns AuthenticatedUser - Thông tin user để gắn vào request.user
   * @throws UnauthorizedException nếu payload không hợp lệ
   */
  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    // Kiểm tra payload có sub (user ID) không
    if (!payload.sub) {
      throw new UnauthorizedException('Token payload không hợp lệ');
    }

    // Lấy username từ các field có thể có trong token (ưu tiên preferred_username)
    const tokenUsername =
      payload.preferred_username ??
      payload.username ??
      payload.email?.split('@')[0];

    let resolvedUsername = tokenUsername;
    // Nếu không tìm thấy username trong token, thử lấy từ database
    if (!resolvedUsername) {
      try {
        const user = await this.userService.findByKeycloakId(payload.sub);
        resolvedUsername = user.username;
      } catch {
        // Nếu không tìm thấy, sẽ dùng keycloak_id làm fallback
      }
    }

    // Lấy realm roles từ token (đây là các role được gán cho user trong Keycloak)
    const realmRoles = payload.realm_access?.roles ?? [];
    this.logger.debug(
      `[JwtStrategy] Token realm_roles: ${JSON.stringify(realmRoles)}`,
    );

    // Map realm roles sang UserRole của ứng dụng
    const role = mapRealmRolesToUserRole(realmRoles, resolvedUsername);
    this.logger.log(
      `[JwtStrategy] User ${resolvedUsername ?? payload.sub} assigned role: ${role}`,
    );

    // Trả về thông tin user đã xác thực
    return {
      keycloak_id: payload.sub,
      username: resolvedUsername ?? payload.sub,
      email:
        payload.email ?? buildFallbackEmail(resolvedUsername ?? payload.sub),
      role,
      realm_roles: realmRoles,
    };
  }
}
