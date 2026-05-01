import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
// Guard kiểm tra quyền truy cập dựa trên vai trò (roles) của người dùng
export class RolesGuard implements CanActivate {
  // Inject Reflector để lấy metadata (dữ liệu bổ sung) từ handler
  constructor(private reflector: Reflector) {}

  // Hàm kiểm tra xem request hiện tại có được phép thực hiện hay không
  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách các vai trò yêu cầu từ metadata (ưu tiên handler, nếu không có thì lấy ở class)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ])
    // Nếu không có yêu cầu vai trò nào, cho phép truy cập
    if (!requiredRoles) return true

    // Lấy request HTTP hiện tại
    const req = context.switchToHttp().getRequest()
    // Lấy thông tin người dùng từ request (được gán bởi middleware/auth guard trước đó)
    const user = req.user
    // Lấy danh sách các vai trò của người dùng từ thuộc tính realm_access.roles, nếu không có thì trả về mảng rỗng
    const roles = user?.realm_access?.roles || []

    // Kiểm tra xem người dùng có ít nhất một vai trò phù hợp với yêu cầu không
    const has = requiredRoles.some((r) => roles.includes(r))
    // Nếu không có vai trò phù hợp, ném ra ngoại lệ Forbidden (403)
    if (!has) throw new ForbiddenException('Insufficient role')
    // Nếu có vai trò phù hợp, cho phép truy cập
    return true
  }
}
