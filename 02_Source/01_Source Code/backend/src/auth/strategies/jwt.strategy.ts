import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { KeycloakJwtPayload } from '../../keycloak/keycloak.service';
import { UserRole } from '../../schemas/user.schema';
import { mapRealmRolesToUserRole } from '../utils/role-mapper';

export interface AuthenticatedUser {
  keycloak_id: string;
  username: string;
  email: string;
  role: UserRole;
  realm_roles: string[];
}

/**
 * JwtStrategy — xác thực Bearer token từ Keycloak bằng JWKS endpoint.
 * Không cần lưu public key cứng — tự động lấy từ Keycloak.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    const serverUrl = config.get<string>('KEYCLOAK_SERVER_URL', 'http://localhost:8080');
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');
    const jwksUri = `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`;
    const issuer = `${serverUrl}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // jwks-rsa: tự fetch và cache public key từ Keycloak
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      issuer,
      algorithms: ['RS256'],
      ignoreExpiration: false,
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

    // Lấy realm roles từ token
    const realmRoles = payload.realm_access?.roles ?? [];
    this.logger.debug(`[JwtStrategy] Token realm_roles: ${JSON.stringify(realmRoles)}`);

    const role = mapRealmRolesToUserRole(
      realmRoles,
      payload.preferred_username,
    );
    this.logger.log(`[JwtStrategy] User ${payload.preferred_username} assigned role: ${role}`);

    return {
      keycloak_id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      role,
      realm_roles: realmRoles,
    };
  }
}
