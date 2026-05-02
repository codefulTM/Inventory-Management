/**
 * File: jwt.strategy.ts
 * Mô tả: Passport Strategy xác thực JWT token từ Keycloak.
 *
 * Chức năng:
 * - Xác thực chữ ký JWT bằng public key từ Keycloak JWKS endpoint
 * - Không cần lưu public key cứng - tự động lấy từ Keycloak (jwks-rsa)
 * - Giải mã payload và ánh xạ thành AuthenticatedUser
 * - Gắn thông tin user vào request.user để sử dụng ở các guard/controller tiếp theo
 *
 * Cấu hình:
 * - Sử dụng RS256 algorithm (RSA + SHA256)
 * - JWKS URI: {keycloak-server}/realms/{realm}/protocol/openid-connect/certs
 * - Issuer: {keycloak-server}/realms/{realm}
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
} from '../utils/role-mapper';

/**
 * Interface mô tả cấu trúc payload của JWT token từ Keycloak
 */
interface KeycloakJwtPayload {
  sub: string;                  // Keycloak user ID (subject)
  preferred_username?: string;   // Tên đăng nhập ưa thích
  username?: string;             // Tên đăng nhập
  email?: string;                // Email user
  realm_access?: { roles: string[] };  // Realm roles từ Keycloak
  resource_access?: Record<string, { roles: string[] }>; // Client roles
  exp: number;                  // Thời điểm hết hạn (unix timestamp)
  iat: number;                  // Thời điểm phát hành token
}

/**
 * Interface mô tả thông tin user đã được xác thực (được gắn vào request.user)
 */
export interface AuthenticatedUser {
  keycloak_id: string;     // ID của user trong Keycloak
  username: string;         // Tên đăng nhập
  email: string;            // Email
  role: UserRole;           // Vai trò trong hệ thống (đã được map)
  realm_roles: string[];    // Danh sách realm roles từ token
}

/**
 * JwtStrategy — xác thực Bearer token từ Keycloak bằng JWKS endpoint.
 * Không cần lưu public key cứng — tự động lấy từ Keycloak.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    const serverUrl = config.get<string>(
      'KEYCLOAK_SERVER_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');
    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;
    const issuer = `${serverUrl}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // jwks-rsa: tự fetch và cache public key từ Keycloak
      secretOrKeyProvider: passportJwtSecret({
        cache: true,           // Cache public keys để tăng hiệu năng
        rateLimit: true,        // Giới hạn số lần gọi JWKS endpoint
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      issuer,
      algorithms: ['RS256'],   // Keycloak sử dụng RSA256
      ignoreExpiration: false,  // Từ chối token đã hết hạn
    });
  }

  /**
   * Được gọi sau khi JWT được verify thành công.
   * Map payload Keycloak → AuthenticatedUser gắn vào request.user
   */
  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Token payload không hợp lệ');
    }

    // Lấy username từ token (thử nhiều field khác nhau)
    const tokenUsername =
      payload.preferred_username ??
      payload.username ??
      payload.email?.split('@')[0];

    let resolvedUsername = tokenUsername;
    if (!resolvedUsername) {
      try {
        // Fallback: tra cứu username từ MongoDB bằng keycloak_id
        const user = await this.userService.findByKeycloakId(payload.sub);
        resolvedUsername = user.username;
      } catch {
        // Fallback dùng keycloak_id nếu không resolve được username
      }
    }

    // Lấy realm roles từ token
    const realmRoles = payload.realm_access?.roles ?? [];
    this.logger.debug(
      `[JwtStrategy] Token realm_roles: ${JSON.stringify(realmRoles)}`,
    );

    // Map realm roles sang UserRole của hệ thống
    const role = mapRealmRolesToUserRole(realmRoles, resolvedUsername);
    this.logger.log(
      `[JwtStrategy] User ${resolvedUsername ?? payload.sub} assigned role: ${role}`,
    );

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
