import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { UserModule } from '../../user/user.module';

/**
 * CommonAuthModule — provides JWT validation guards for the backend.
 * Auth operations (login, register, etc.) are handled by keycloak-service.
 * This module only validates tokens locally via JWKS.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class CommonAuthModule {}
