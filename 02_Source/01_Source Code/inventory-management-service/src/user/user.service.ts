// === user.service.ts ===
// Service CRUD user trong NestJS backend
// Key methods: createUser, findAll, findById, findByUsername, update, setActiveStatus, changePassword, delete
// API: MongoDB (UserRepository), Keycloak (KeycloakGrpcClientService), Mail, AuditLog

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly repository: UserRepository,
    private readonly keycloakService: KeycloakGrpcClientService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private toResponse(user: UserDocument | User): UserResponseDto {
    return { user_id: user.user_id, keycloak_id: user.keycloak_id, username: user.username, email: user.email, role: user.role, is_active: user.is_active, lock_type: (user as any).lock_type, lock_reason: (user as any).lock_reason, last_login: user.last_login, created_date: (user as any).created_date, modified_date: (user as any).modified_date };
  }

  /**
   * Tạo user mới: đăng ký vào Keycloak + lưu vào MongoDB.
   * Dùng bởi Manager/IT Admin tạo user cho người khác.
   */
  async createUser(
    dto: CreateUserDto,
    actor?: string,
    ctx: LogContext = {},
  ): Promise<UserResponseDto> {
    // [SKELETON: Check duplicate username/email → Generate temp password → Create user in Keycloak → Create user in MongoDB → Send welcome email → Log audit → Return user]
  }

  /**
   * Tạo user từ AuthService (register tự đăng ký) — không cần kiểm tra lại.
   */
  async create(data: Partial<User>): Promise<UserResponseDto> {
    // [SKELETON: Create user in MongoDB → Return response]
  }

  /**
   * Get all users with pagination
   */
  async findAll(page = 1, limit = 20): Promise<PaginatedUserResponseDto> {
    // [SKELETON: Query paginated users → Map to response → Return with pagination]
  }

  /**
   * Find user by ID
   */
  async findById(user_id: string): Promise<UserResponseDto> {
    // [SKELETON: Find by ID → Return user or throw NotFound]
  }

  /**
   * Find user by Keycloak ID
   */
  async findByKeycloakId(keycloak_id: string): Promise<UserResponseDto> {
    // [SKELETON: Find by keycloak_id → Return user or throw NotFound]
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    // [SKELETON: Find by username → Return user or null]
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    // [SKELETON: Find by email → Return user or null]
  }

  /**
   * Find users by role
   */
  async findByRole(
    role: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedUserResponseDto> {
    // [SKELETON: Validate role → Query paginated users by role → Return with pagination]
  }

  /**
   * Search users by keyword
   */
  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedUserResponseDto> {
    // [SKELETON: Validate query length → Search users → Return with pagination]
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    // [SKELETON: Count by role, active, total → Return statistics]
  }

  /**
   * Update user information
   */
  async update(
    user_id: string,
    dto: UpdateUserDto,
    actor?: string,
    ctx: LogContext = {},
  ): Promise<UserResponseDto> {
    // [SKELETON: Check user exists → Check duplicate username/email → Update Keycloak → Update MongoDB → Log audit → Return updated user]
  }

  /**
   * Khóa / Mở khóa tài khoản.
   * Đồng bộ trạng thái sang Keycloak để ngay lập tức vô hiệu hóa phiên.
   */
  async setActiveStatus(
    user_id: string,
    is_active: boolean,
    lockDto?: LockUserDto,
    actor?: string,
    ctx: LogContext = {},
  ): Promise<UserResponseDto> {
    // [SKELETON: Find user → Sync to Keycloak (enable/disable) → Update MongoDB with lock info → Log audit → Return updated user]
  }

  /**
   * Đặt lại mật khẩu — chỉ thực hiện trong Keycloak.
   */
  async changePassword(
    user_id: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // [SKELETON: Find user → Verify keycloak_id → Reset password in Keycloak → Return success message]
  }

  async updateLastLogin(user_id: string): Promise<void> {
    // [SKELETON: Update last_login timestamp in MongoDB]
  }

  /**
   * Xóa user: xóa khỏi Keycloak trước, rồi xóa khỏi MongoDB.
   */
  async delete(
    user_id: string,
  ): Promise<{ success: boolean; message: string }> {
    // [SKELETON: Find user → Delete from Keycloak if linked → Delete from MongoDB → Log audit → Return success message]
  }
}