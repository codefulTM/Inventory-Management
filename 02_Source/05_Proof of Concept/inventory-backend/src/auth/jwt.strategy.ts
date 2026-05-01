import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import * as jwksRsa from 'jwks-rsa'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Lấy public key từ JWKS của Keycloak
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri:
          process.env.KEYCLOAK_JWKS_URI ||
          'http://localhost:8081/realms/inventory-management/protocol/openid-connect/certs',
        cache: true,
        rateLimit: true,
      }),
      algorithms: ['RS256'],
    })
  }

  async validate(payload: any) {
    // payload là object decoded từ access token
    return payload
  }
}
