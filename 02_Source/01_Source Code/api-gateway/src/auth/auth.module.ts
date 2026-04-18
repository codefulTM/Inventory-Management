import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [AuthGatewayService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthGatewayService, JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class AuthModule {}
