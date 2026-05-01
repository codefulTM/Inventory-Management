import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '../../schemas/user.schema';
import { buildFallbackEmail, mapRealmRolesToUserRole } from '../../utils/role-mapper';

interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  username?: string;
  email?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
}

export interface AuthenticatedUser {
  keycloak_id: string;
  username: string;
  email: string;
  role: UserRole;
  realm_roles: string[];
}

/**
 * JwtStrategy — validates Bearer token via Keycloak JWKS.
 * Used by api-gateway for token validation on every incoming request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly config: ConfigService) {
    const serverUrl = config.get<string>(
      'KEYCLOAK_SERVER_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');
    // Prefer explicit JWKS_URI / JWT_ISSUER env vars; fall back to constructing
    // from KEYCLOAK_SERVER_URL so the strategy works both in Docker and locally.
    const jwksUri = config.get<string>(
      'JWKS_URI',
      `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`,
    );
    const issuer = config.get<string>(
      'JWT_ISSUER',
      `${serverUrl}/realms/${realm}`,
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      issuer,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    const realmRoles: string[] = payload.realm_access?.roles ?? [];
    this.logger.debug(`[JWT] sub=${payload.sub} preferred_username=${payload.preferred_username} realm_access=${JSON.stringify(payload.realm_access)}`);
    const username =
      payload.preferred_username ?? payload.username ?? payload.sub;
    const email = payload.email ?? buildFallbackEmail(username);
    const role = mapRealmRolesToUserRole(realmRoles, username);

    return {
      keycloak_id: payload.sub,
      username,
      email,
      role,
      realm_roles: realmRoles,
    };
  }
}
