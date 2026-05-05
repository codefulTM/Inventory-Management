// === auth.service.ts ===
// Service xác thực: login, logout, register, refreshToken, forgotPassword, resetPassword
// Key methods: login, logout, register, getMe, forgotPassword, resetPassword
// API: Keycloak (keycloakService), MongoDB (userService), Mail (mailService), AuditLog
import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { KeycloakService } from '../keycloak/keycloak.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { AuditLogService, LogContext } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.schema';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { buildFallbackEmail, mapRealmRolesToUserRole } from './utils/role-mapper';
import { PasswordResetToken, PasswordResetTokenDocument } from '../schemas/password-reset-token.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
    @InjectModel(PasswordResetToken.name)
    private readonly resetTokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  /**
   * Đăng nhập: xác thực qua Keycloak, cập nhật last_login trong MongoDB.
   */
  async login(dto: LoginDto, ctx: LogContext = {}) {
    // [SKELETON: Check account status in MongoDB → Verify credentials via Keycloak → Find or create user in MongoDB → Update last_login → Return token + user info]
  }

  /**
   * Refresh token - Làm mới access_token bằng refresh_token
   */
  async refreshToken(refreshToken: string) {
    // [SKELETON: Verify refresh token with Keycloak → Return new access token]
  }

  /**
   * Logout — thu hồi token tại Keycloak và ghi audit log
   */
  async logout(
    refreshToken: string,
    username?: string,
    userId?: string,
    ctx: LogContext = {},
  ): Promise<{ message: string }> {
    // [SKELETON: Revoke token at Keycloak → Log audit success/failure → Return message]
  }

  /**
   * Tự đăng ký tài khoản (chỉ role Operator).
   * Tạo user trong cả Keycloak và MongoDB.
   */
  async register(dto: RegisterDto) {
    // [SKELETON: Check duplicate username/email → Create user in Keycloak → Create user in MongoDB → Return user info]
  }

  /**
   * Lấy thông tin user hiện tại từ token
   */
  async getMe(keycloakId: string) {
    // [SKELETON: Find user by keycloak_id → Return user info]
  }

  /**
   * Gửi link đặt lại mật khẩu về email
   */
  async forgotPassword(email: string, ctx: LogContext = {}): Promise<{ message: string }> {
    // [SKELETON: Find user by email → Generate reset token → Send reset email → Return generic message (avoid info leakage)]
  }

  /**
   * Đặt lại mật khẩu bằng token
   */
  async resetPassword(token: string, newPassword: string, ctx: LogContext = {}): Promise<{ message: string }> {
    // [SKELETON: Validate token (exists, not used, not expired) → Find user → Reset password in Keycloak → Mark token as used → Return success]
  }
}