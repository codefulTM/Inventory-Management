import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  // Service mẫu - trong PoC chúng ta tin tưởng payload từ token.
  // Hàm validateUser có thể được mở rộng để truy vấn hoặc tạo user profile trong DB nếu cần.
  async validateUser(payload: any) {
    // Ví dụ: lấy hoặc tạo hồ sơ người dùng dựa trên payload.sub (user id từ Keycloak)
    return payload
  }
}
