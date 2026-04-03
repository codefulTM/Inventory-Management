import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  LockUserDto,
} from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../schemas/user.schema';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * UserController
 * Routes: /users
 *
 * Phân quyền:
 *  - Manager / IT Administrator: CRUD đầy đủ
 *  - Mọi role đã đăng nhập: xem profile bản thân, đổi mật khẩu bản thân
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
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

  // ─── Admin / Manager endpoints ─────────────────────────────────────────────

  /**
   * GET /users
   * Danh sách user (phân trang)
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.userService.findAll(page, limit);
  }

  /**
   * GET /users/statistics
   * Thống kê user theo role, active/inactive
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  getStatistics() {
    return this.userService.getStatistics();
  }

  /**
   * GET /users/search?q=
   * Tìm kiếm user theo username hoặc email
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Get('search')
  @HttpCode(HttpStatus.OK)
  search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.userService.search(query, page, limit);
  }

  /**
   * GET /users/role/:role
   * Lọc user theo role
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Get('role/:role')
  @HttpCode(HttpStatus.OK)
  findByRole(
    @Param('role') role: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.userService.findByRole(role, page, limit);
  }

  /**
   * GET /users/me
   * Lấy thông tin user đang đăng nhập (mọi role)
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.findByKeycloakId(user.keycloak_id);
  }

  /**
   * GET /users/:id
   * Chi tiết user theo user_id
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  /**
   * POST /users
   * Tạo user mới (Manager / IT Admin)
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const username = await this.getActorUsername(actor);
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    this.logger.log(`[Create User] actor: ${username}`);
    return this.userService.createUser(dto, username, ctx);
  }

  /**
   * PUT /users/:id
   * Cập nhật thông tin user (email, role, is_active)
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const username = await this.getActorUsername(actor);
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    this.logger.log(`[Update User] actor: ${username}`);
    return this.userService.update(id, dto, username, ctx);
  }

  /**
   * PATCH /users/:id/activate
   * Kích hoạt tài khoản
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: Request) {
    const username = await this.getActorUsername(actor);
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    this.logger.log(`[Activate User] actor: ${username}`);
    return this.userService.setActiveStatus(id, true, undefined, username, ctx);
  }

  /**
   * PATCH /users/:id/deactivate
   * Vô hiệu hóa tài khoản — thu hồi session ngay lập tức qua Keycloak
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: LockUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const username = await this.getActorUsername(actor);
    const ctx = {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
    this.logger.log(`[Deactivate User] actor: ${username}`);
    return this.userService.setActiveStatus(id, false, dto, username, ctx);
  }

  /**
   * PATCH /users/:id/password
   * Đặt lại mật khẩu (Manager/IT Admin đặt cho người khác,
   * hoặc user tự đặt lại mật khẩu của mình)
   */
  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: ChangePasswordDto,
    @CurrentUser() _currentUser: AuthenticatedUser,
  ) {
    return this.userService.changePassword(id, dto);
  }

  /**
   * DELETE /users/:id
   * Xóa user (IT Administrator only)
   */
  @Roles(UserRole.IT_ADMINISTRATOR)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
