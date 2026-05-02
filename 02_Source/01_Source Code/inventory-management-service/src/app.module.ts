/**
 * AppModule - Root Module của Inventory Management Microservice
 * 
 * Đây là module gốc (root module) chịu trách nhiệm kết nối tất cả các module con:
 * 
 * CÁC MODULE NGHIỆP VỤ CHÍNH:
 * - DatabaseModule: Kết nối MongoDB qua Mongoose
 * - CommonAuthModule: Xác thực JWT và phân quyền (JwtAuthGuard, RolesGuard)
 * - UserModule: Quản lý người dùng
 * - MaterialModule: Quản lý vật tư (nguyên liệu, thành phẩm)
 * - InventoryLotModule: Quản lý lô hàng tồn kho
 * - ProductionBatchModule: Quản lý lô sản xuất và thành phần
 * - InventoryTransactionModule: Quản lý giao dịch nhập/xuất kho
 * - QCTestModule: Quản lý kiểm tra chất lượng (Quality Control)
 * - LabelTemplateModule: Quản lý mẫu nhãn barcode/QR
 * - ImportExportOrderModule: Quản lý đơn đặt hàng nhập/xuất
 * - WarehouseSlipModule: Quản lý phiếu nhập/xuất kho
 * - InventoryAdjustmentModule: Điều chỉnh tồn kho (kiểm kê, hủy hao hụt)
 * - InventoryAuditReportModule: Báo cáo kiểm kê tồn kho
 * - WarehouseModule & WarehouseHierarchyModule: Quản lý cấu trúc kho (zone, rack, bin)
 * 
 * CÁC MODULE HỆ THỐNG:
 * - SystemMonitoringModule: Giám sát hệ thống
 * - LogModule: Quản lý log
 * - BarcodeModule: Tạo mã vạch/QR
 * - MetricsModule: Expose metrics cho Prometheus
 * - DashboardModule: API tổng hợp dữ liệu cho dashboard
 * - AuditLogModule: Ghi log kiểm toán cho mọi thay đổi dữ liệu
 * - AiDataGrpcModule: Cung cấp dữ liệu cho AI Service qua gRPC
 * - RedisIdModule: Tạo ID duy nhất sử dụng Redis
 * 
 * GLOBAL GUARDS:
 * - JwtAuthGuard: Bảo vệ tất cả routes, yêu cầu JWT token hợp lệ
 * - RolesGuard: Kiểm tra quyền truy cập based on roles (@Roles decorator)
 * - Sử dụng @Public() decorator để bỏ qua xác thực cho routes công khai
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { CommonAuthModule } from './common/auth/common-auth.module';
import { UserModule } from './user/user.module';
import { MaterialModule } from './material/material.module';
import { InventoryLotModule } from './inventory-lot/inventory-lot.module';
import { ProductionBatchModule } from './production-batch/production-batch.module';
import { InventoryTransactionModule } from './inventory-transaction/inventory-transaction.module';
import { QCTestModule } from './qc-test/qc-test.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { LabelTemplateModule } from './label-template/label-template.module';
import { WarehouseHierarchyModule } from './warehouse-hierarchy/warehouse-hierarchy.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { LogModule } from './log-management/log.module';
import { BarcodeModule } from './barcode/barcode.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppService } from './app.service';
import { ImportExportOrderModule } from './import-export-order/import-export-order.module';
import { WarehouseSlipModule } from './warehouse-slip/warehouse-slip.module';
import { InventoryAdjustmentModule } from './inventory-adjustment/inventory-adjustment.module';
import { InventoryAuditReportModule } from './inventory-audit-report/inventory-audit-report.module';
import { AiDataGrpcModule } from './ai-data-grpc/ai-data-grpc.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RedisIdModule } from './redis-id/redis-id.module';

@Module({
  imports: [
    // ConfigModule được cấu hình global để có thể inject ConfigService ở mọi nơi
    ConfigModule.forRoot({ isGlobal: true }),
    // Kết nối cơ sở dữ liệu MongoDB
    DatabaseModule,
    // Module xác thực và phân quyền (JWT + Keycloak)
    CommonAuthModule,
    // Các module quản lý người dùng
    UserModule,
    // Quản lý vật tư (nguyên liệu, thành phẩm, bán thành phẩm...)
    MaterialModule,
    // Quản lý lô hàng trong kho (theo dõi hạn sử dụng, số lượng...)
    InventoryLotModule,
    // Quản lý lô sản xuất và các thành phần cấu tạo
    ProductionBatchModule,
    // Quản lý giao dịch nhập/xuất kho (IN/OUT)
    InventoryTransactionModule,
    // Quản lý kiểm tra chất lượng (QC test, quarantine)
    QCTestModule,
    // Quản lý mẫu nhãn barcode/QR code
    LabelTemplateModule,
    // Quản lý đơn đặt hàng nhập/xuất từ nhà cung cấp/khách hàng
    ImportExportOrderModule,
    // Quản lý phiếu nhập/xuất kho (warehouse slips)
    WarehouseSlipModule,
    // Điều chỉnh tồn kho (kiểm kê, hủy hao hụt, chuyển kho...)
    InventoryAdjustmentModule,
    // Báo cáo kiểm kê và lịch sử tồn kho
    InventoryAuditReportModule,
    // Quản lý kho và cấu trúc phân cấp (zone/rack/bin)
    WarehouseModule,
    WarehouseHierarchyModule,
    // Giám sát hệ thống và thu thập thông số
    SystemMonitoringModule,
    // Quản lý log hệ thống
    LogModule,
    // Tạo và quản lý mã vạch/QR code
    BarcodeModule,
    // Expose metrics cho Prometheus scraping
    MetricsModule,
    // API tổng hợp dữ liệu cho dashboard
    DashboardModule,
    // Ghi log kiểm toán bất biến cho mọi thay đổi dữ liệu
    AuditLogModule,
    // Cung cấp dữ liệu cho AI Service qua gRPC
    AiDataGrpcModule,
    // Tạo ID duy nhất sử dụng Redis (thay vì tự tăng MongoDB)
    RedisIdModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Đăng ký JwtAuthGuard làm global guard
    // Tất cả routes đều yêu cầu JWT token hợp lệ, trừ khi dùng @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Đăng ký RolesGuard làm global guard
    // Kiểm tra quyền truy cập dựa trên roles (@Roles decorator)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
