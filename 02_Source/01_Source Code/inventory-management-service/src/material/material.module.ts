/**
 * MaterialModule - Module quản lý vật tư (nguyên liệu, thành phẩm, bao bì...)
 * 
 * Chức năng chính:
 * - Quản lý thông tin các loại vật tư trong hệ thống
 * - Hỗ trợ nhiều loại vật tư: API (Active Pharmaceutical Ingredient), Excipient,
 *   Dietary Supplement, Container, Closure, Process Chemical, Testing Material
 * - Tạo ID tự động sử dụng Redis (định dạng MAT-XXX)
 * - Phân trang, tìm kiếm, lọc theo loại vật tư
 * - Export dữ liệu ra Excel/PDF
 * 
 * Các thành phần:
 * - MaterialController: REST API endpoints
 * - MaterialService: Xử lý nghiệp vụ
 * - MaterialRepository: Thao tác với MongoDB qua Mongoose
 * - MaterialSchema: Định nghĩa cấu trúc dữ liệu trong MongoDB
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from '../schemas/material.schema';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { MaterialRepository } from './material.repository';

@Module({
  imports: [
    // Đăng ký Material model với Mongoose
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
    ]),
  ],
  controllers: [MaterialController],
  providers: [MaterialRepository, MaterialService],
  // Export để các module khác có thể sử dụng MaterialService (ví dụ: InventoryLotModule)
  exports: [MaterialService, MaterialRepository],
})
export class MaterialModule {}
