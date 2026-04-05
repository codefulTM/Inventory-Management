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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { UserRepository } from '../user/user.repository';

/**
 * AuthController
 * Routes: /auth
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Helper: Get actor's username from @CurrentUser or DB lookup
   */
  private async getActorUsername(actor: AuthenticatedUser): Promise<string | undefined> {
    if (actor?.username) {
      this.logger.debug(`[getActorUsername] Using @CurrentUser username: ${actor.username}`);
      return actor.username;
    }
    
    // Fallback: lookup username in DB using keycloak_id
    if (actor?.keycloak_id) {
      try {
        const user = await this.userRepository.findByKeycloakId(actor.keycloak_id);
        if (user?.username) {
          this.logger.debug(`[getActorUsername] Found username in DB: ${user.username}`);
          return user.username;
        }
      } catch (err) {
        this.logger.error(`[getActorUsername] Failed to lookup user in DB:`, err);
      }
    }
    
    this.logger.warn(`[getActorUsername] Could not determine actor username, will default to 'system'`);
    return undefined;
  }

  /**
   * POST /auth/login
   * Đăng nhập — trả về Keycloak access_token + refresh_token
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) dto: LoginDto, @Req() req: Request) {
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    const result = await this.authService.login(dto, ctx);
    return { success: true, data: result };
  }

  /**
   * POST /auth/register
   * Tự đăng ký tài khoản Operator
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/refresh
   * Làm mới access_token bằng refresh_token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(ValidationPipe) dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  /**
   * POST /auth/logout
   * Đăng xuất — revoke refresh_token tại Keycloak
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(ValidationPipe) dto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const username = await this.getActorUsername(user);
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    this.logger.log(`[Logout] actor: ${username}`);
    return this.authService.logout(dto.refresh_token, username, undefined, ctx);
  }

  /**
   * POST /auth/forgot-password
   * Gửi link đặt lại mật khẩu về email
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body(ValidationPipe) dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /auth/reset-password
   * Đặt lại mật khẩu bằng token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  /**
   * GET /auth/me
   * Lấy thông tin user đang đăng nhập
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.keycloak_id);
  }
}
