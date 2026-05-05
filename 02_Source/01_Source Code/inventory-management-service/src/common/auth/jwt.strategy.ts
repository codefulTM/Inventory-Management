import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRole } from '../../schemas/user.schema';
import { UserService } from '../../user/user.service';
import { buildFallbackEmail, mapRealmRolesToUserRole } from './role-mapper';

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    const serverUrl = config.get<string>('KEYCLOAK_SERVER_URL', 'http://localhost:8080');
    const realm = config.get<string>('KEYCLOAK_REALM', 'inventory');
    const jwksUri = config.get<string>('JWKS_URI', `${serverUrl}/realms/${realm}/protocol/openid-connect/certs`);
    const issuer = config.get<string>('JWT_ISSUER', `${serverUrl}/realms/${realm}`);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({ cache: true, rateLimit: true, jwksRequestsPerMinute: 5, jwksUri }),
      issuer,
      algorithms: ['RS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) throw new UnauthorizedException('Token payload không hợp lệ');
    const tokenUsername = payload.preferred_username ?? payload.username ?? payload.email?.split('@')[0];
    let resolvedUsername = tokenUsername;
    if (!resolvedUsername) {
      try {
        const user = await this.userService.findByKeycloakId(payload.sub);
        resolvedUsername = user.username;
      } catch { /* fallback to keycloak_id */ }
    }
    const realmRoles = payload.realm_access?.roles ?? [];
    const role = mapRealmRolesToUserRole(realmRoles, resolvedUsername);
    return {
      keycloak_id: payload.sub,
      username: resolvedUsername ?? payload.sub,
      email: payload.email ?? buildFallbackEmail(resolvedUsername ?? payload.sub),
      role,
      realm_roles: realmRoles,
    };
  }
}
