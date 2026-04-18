import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGatewayService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * AuthController (api-gateway)
 * Forwards /auth/* HTTP requests to keycloak-service via gRPC.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthGatewayService) {}

  private extractCtx(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '',
      user_agent: req.headers['user-agent'] ?? '',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) body: { username: string; password: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    const result = await this.authService.login({ ...body, ...ctx });
    return { success: true, data: result };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) body: { username: string; email: string; password: string }) {
    return this.authService.register(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: { refresh_token: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ctx = this.extractCtx(req);
    return this.authService.logout({
      refresh_token: body.refresh_token,
      username: user?.username,
      ...ctx,
    });
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    return this.authService.forgotPassword({ email: body.email, ...ctx });
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; new_password: string }, @Req() req: Request) {
    const ctx = this.extractCtx(req);
    return this.authService.resetPassword({ ...body, ...ctx });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.keycloak_id);
  }
}
