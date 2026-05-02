/**
 * File: auth.service.ts
 * Mô tả: Service đóng vai trò Gateway cho xác thực - gọi gRPC đến keycloak-service
 * Chức năng: Cung cấp các phương thức gọi đến keycloak-service qua gRPC
 * 
 * Luồng hoạt động: API Gateway → gRPC → keycloak-service (port 50051)
 * 
 * Lưu ý: Sử dụng lastValueFrom để chuyển đổi Observable (RxJS) thành Promise
 * để dễ dàng sử dụng với async/await trong controller
 */
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { AUTH_SERVICE_TOKEN } from '../grpc/grpc.module';

/**
 * Interface định nghĩa các phương thức gRPC có sẵn từ keycloak-service
 * Sử dụng Observable vì gRPC client của NestJS trả về Observable (RxJS)
 */
interface AuthGrpcService {
  // Đăng nhập - xác thực username/password với Keycloak
  login(data: {
    username: string;
    password: string;
    ip?: string;        // IP của client (để audit)
    user_agent?: string; // User-Agent của client (để audit)
  }): Observable<any>;
  
  // Đăng ký tài khoản mới trong Keycloak
  register(data: { username: string; email: string; password: string }): Observable<any>;
  
  // Làm mới access token bằng refresh token
  refresh(data: { refresh_token: string }): Observable<any>;
  
  // Đăng xuất - thu hồi refresh token trong Keycloak
  logout(data: {
    refresh_token: string;
    username?: string;
    ip?: string;
    user_agent?: string;
  }): Observable<any>;
  
  // Yêu cầu đặt lại mật khẩu - gửi email hướng dẫn
  forgotPassword(data: { email: string; ip?: string; user_agent?: string }): Observable<any>;
  
  // Đặt lại mật khẩu bằng token từ email
  resetPassword(data: {
    token: string;
    new_password: string;
    ip?: string;
    user_agent?: string;
  }): Observable<any>;
  
  // Lấy thông tin chi tiết user từ Keycloak bằng keycloak_id
  getMe(data: { keycloak_id: string }): Observable<any>;
}

/**
 * AuthGatewayService — wraps gRPC client calls to keycloak-service.
 * Đóng vai trò là lớp trung gian giữa HTTP API và gRPC service
 */
@Injectable()
export class AuthGatewayService implements OnModuleInit {
  // Instance của gRPC service client - được khởi tạo trong onModuleInit
  private grpcService: AuthGrpcService;

  constructor(
    // Inject gRPC client đã được đăng ký trong GrpcModule với token AUTH_SERVICE_TOKEN
    @Inject(AUTH_SERVICE_TOKEN) private readonly client: ClientGrpc,
  ) {}

  /**
   * Lifecycle hook - chạy khi module được khởi tạo
   * Lấy reference đến AuthService từ gRPC client
   */
  onModuleInit() {
    this.grpcService = this.client.getService<AuthGrpcService>('AuthService');
  }

  /**
   * Gọi gRPC login đến keycloak-service
   * @param data - Thông tin đăng nhập (username, password, ip, user_agent)
   * @returns Promise chứa kết quả từ keycloak-service (tokens, user info)
   */
  login(data: { username: string; password: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.login(data));
  }

  /**
   * Gọi gRPC register đến keycloak-service
   * @param data - Thông tin đăng ký (username, email, password)
   * @returns Promise chứa kết quả tạo tài khoản
   */
  register(data: { username: string; email: string; password: string }) {
    return lastValueFrom(this.grpcService.register(data));
  }

  /**
   * Gọi gRPC refresh đến keycloak-service
   * @param refresh_token - Refresh token dùng để lấy access token mới
   * @returns Promise chứa access token mới và refresh token mới
   */
  refresh(refresh_token: string) {
    return lastValueFrom(this.grpcService.refresh({ refresh_token }));
  }

  /**
   * Gọi gRPC logout đến keycloak-service
   * @param data - Thông tin đăng xuất (refresh_token, username, ip, user_agent)
   * @returns Promise chứa kết quả thu hồi token
   */
  logout(data: { refresh_token: string; username?: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.logout(data));
  }

  /**
   * Gọi gRPC forgotPassword đến keycloak-service
   * @param data - Email và thông tin client
   * @returns Promise chứa kết quả gửi email reset
   */
  forgotPassword(data: { email: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.forgotPassword(data));
  }

  /**
   * Gọi gRPC resetPassword đến keycloak-service
   * @param data - Token xác thực và mật khẩu mới
   * @returns Promise chứa kết quả đặt lại mật khẩu
   */
  resetPassword(data: { token: string; new_password: string; ip?: string; user_agent?: string }) {
    return lastValueFrom(this.grpcService.resetPassword(data));
  }

  /**
   * Gọi gRPC getMe đến keycloak-service
   * @param keycloak_id - ID của user trong Keycloak
   * @returns Promise chứa thông tin chi tiết user
   */
  getMe(keycloak_id: string) {
    return lastValueFrom(this.grpcService.getMe({ keycloak_id }));
  }
}
