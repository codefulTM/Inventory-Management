import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';
import { AuthenticatedUser } from '../common/auth/jwt.strategy';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { QueryInventoryAdjustmentDto } from './dto/query-inventory-adjustment.dto';

/**
 * Controller xử lý các API liên quan đến điều chỉnh tồn kho
 * Chỉ cho phép Manager thực hiện các thao tác điều chỉnh tồn kho
 * Các route: POST /inventory-adjustments, GET /inventory-adjustments, GET /inventory-adjustments/:id
 */
@Controller('inventory-adjustments')
@UseGuards(RolesGuard)
export class InventoryAdjustmentController {
  constructor(private readonly service: InventoryAdjustmentService) {}

  /**
   * Lấy thông tin người thực hiện yêu cầu từ JWT token
   * Ưu tiên lấy: username -> email -> keycloak_id -> 'system' (mặc định)
   * @param req - Request object chứa thông tin user đã được JWT strategy xác thực
   * @returns Object chứa actor (người thực hiện) và role của họ
   */
  private toRequester(req: { user?: AuthenticatedUser }) {
    const actor =
      req.user?.username?.trim() ||
      req.user?.email?.trim() ||
      req.user?.keycloak_id ||
      'system';

    return {
      actor,
      role: req.user?.role,
    };
  }

  /**
   * API tạo mới một phiếu điều chỉnh tồn kho
   * Chỉ Manager mới có quyền thực hiện
   * ValidationPipe sẽ tự động kiểm tra và loại bỏ các field không nằm trong DTO
   * 
   * Quy trình:
   * 1. Validate dữ liệu đầu vào qua DTO
   * 2. Lấy thông tin người thực hiện từ token
   * 3. Gọi service để tạo adjustment, cập nhật lot và tạo transaction tương ứng
   * 
   * @param dto - Dữ liệu tạo adjustment (lot_id, adjustment_quantity, reason_code, ...)
   * @param req - Request object chứa thông tin user
   * @returns Thông tin adjustment vừa tạo kèm thông tin lot trước và sau điều chỉnh
   */
  @Post()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,        // Loại bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu có field lạ
      transform: true,        // Tự động chuyển đổi kiểu dữ liệu
    }),
  )
  async create(
    @Body() dto: CreateInventoryAdjustmentDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.create(dto, requester);
  }

  /**
   * API lấy danh sách các phiếu điều chỉnh tồn kho (có phân trang và lọc)
   * Chỉ Manager mới có quyền xem
   * 
   * Các tham số query có thể dùng:
   * - lot_id: Lọc theo lô hàng cụ thể
   * - material_id: Lọc theo nguyên liệu
   * - performed_by: Lọc theo người thực hiện
   * - reason_code: Lọc theo lý do điều chỉnh (count, damage, expiry, other)
   * - from/to: Lọc theo khoảng thời gian tạo
   * - page/limit: Phân trang
   * 
   * @param query - Các tham số lọc và phân trang
   * @returns Danh sách adjustments, tổng số bản ghi, page và limit hiện tại
   */
  @Get()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async findAll(@Query() query: QueryInventoryAdjustmentDto) {
    return this.service.findAll(query);
  }

  /**
   * API lấy chi tiết một phiếu điều chỉnh tồn kho theo ID
   * Chỉ Manager mới có quyền xem
   * 
   * @param adjustmentId - ID của phiếu điều chỉnh cần tra cứu
   * @returns Thông tin chi tiết của phiếu điều chỉnh
   * @throws NotFoundException nếu không tìm thấy phiếu điều chỉnh
   */
  @Get(':id')
  @Roles(UserRole.MANAGER)
  async findOne(@Param('id') adjustmentId: string) {
    return this.service.findOne(adjustmentId);
  }
}
