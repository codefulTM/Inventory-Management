import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { UserService } from '../user/user.service';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly userService: UserService,
  ) {}

  /**
   * Đăng nhập: xác thực qua Keycloak, cập nhật last_login trong MongoDB.
   */
  async login(dto: LoginDto) {
    try {
      // 1. Xác thực qua Keycloak
      const tokenSet = await this.keycloakService.loginUser(
        dto.username,
        dto.password,
      );

      // 2. Tìm user trong MongoDB theo username
      let user = await this.userService.findByUsername(dto.username);
      if (!user) {
        // Nếu không có user trong MongoDB, lấy info từ Keycloak
        const kcUser = await this.keycloakService.findKeycloakUserByUsername(
          dto.username,
        );
        if (!kcUser) {
          throw new UnauthorizedException('Không tìm thấy tài khoản Keycloak');
        }
        // Lấy realm roles từ Keycloak
        const realmRoles = await this.keycloakService.getRealmRolesForUser(
          kcUser.id,
        );
        let role: UserRole = UserRole.OPERATOR;
        for (const r of Object.values(UserRole)) {
          if (realmRoles.includes(r)) {
            role = r as UserRole;
            break;
          }
        }
        // Tạo user trong MongoDB
        const userCreated = await this.userService.create({
          username: kcUser.username,
          email: kcUser.email,
          keycloak_id: kcUser.id,
          role,
          is_active: kcUser.enabled,
        });
        if (!userCreated) {
          throw new UnauthorizedException(
            'Không thể tạo tài khoản trong hệ thống',
          );
        }
        user = <UserDocument>{
          user_id: userCreated.user_id,
          username: userCreated.username,
          email: userCreated.email,
          role: userCreated.role,
          is_active: userCreated.is_active,
        };
      }

      if (!user.is_active) {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      }

      // 3. Cập nhật last_login
      await this.userService.updateLastLogin(user.user_id);

      this.logger.log(`User logged in: ${dto.username}`);

      return {
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
        expires_in: tokenSet.expires_in,
        token_type: tokenSet.token_type,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Login failed for username: ${dto.username} - ${error.message}`,
      );
      throw new UnauthorizedException('Đăng nhập thất bại: ' + error.message);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string) {
    const tokenSet = await this.keycloakService.refreshToken(refreshToken);
    return {
      access_token: tokenSet.access_token,
      refresh_token: tokenSet.refresh_token,
      expires_in: tokenSet.expires_in,
      token_type: tokenSet.token_type,
    };
  }

  /**
   * Logout — revoke token tại Keycloak
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.keycloakService.logoutUser(refreshToken);
    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Tự đăng ký tài khoản (chỉ role Operator).
   * Tạo user trong cả Keycloak và MongoDB.
   */
  async register(dto: RegisterDto) {
    // Kiểm tra trùng trong MongoDB
    const existingUser = await this.userService.findByUsername(dto.username);
    if (existingUser) {
      throw new ConflictException(`Username '${dto.username}' đã được sử dụng`);
    }

    const existingEmail = await this.userService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`Email '${dto.email}' đã được sử dụng`);
    }

    // Tạo user trong Keycloak
    const keycloakId = await this.keycloakService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      role: UserRole.OPERATOR,
    });

    // Tạo user trong MongoDB
    const user = await this.userService.create({
      username: dto.username,
      email: dto.email,
      role: UserRole.OPERATOR,
      keycloak_id: keycloakId,
    });

    this.logger.log(`New user registered: ${dto.username} (${keycloakId})`);

    return {
      message: 'Đăng ký thành công',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Lấy thông tin user hiện tại từ token
   */
  async getMe(keycloakId: string) {
    const user = await this.userService.findByKeycloakId(keycloakId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }
    return user;
  }
}
