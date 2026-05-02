/**
 * File: reports.controller.ts
 * Mô tả: Controller xử lý các endpoint báo cáo /reports/*
 * Chức năng: Nhận request HTTP, gọi gRPC đến metrics-service để lấy dữ liệu báo cáo
 * 
 * Các endpoint báo cáo:
 * - GET /reports/inventory-status    — Trạng thái tồn kho
 * - GET /reports/material-usage      — Thống kê sử dụng nguyên vật liệu
 * - GET /reports/qc-performance      — Hiệu suất kiểm tra chất lượng
 * - GET /reports/audit               — Báo cáo kiểm toán (có phân trang)
 * - GET /reports/inventory-trend     — Xu hướng tồn kho theo thời gian
 * - GET /reports/material-usage-trend — Xu hướng sử dụng nguyên vật liệu
 * - GET /reports/qc-trend            — Xu hướng QC theo thời gian
 * - GET /reports/audit-trend         — Xu hướng kiểm toán theo thời gian
 * 
 * Phân quyền: Mặc định chỉ MANAGER và IT_ADMINISTRATOR được truy cập
 * (riêng inventory-status mở rộng thêm OPERATOR)
 */
import {
  Controller,
  Get,
  Query,
  Inject,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../schemas/user.schema";
import { METRICS_SERVICE_TOKEN } from "../grpc/grpc.module";

/**
 * Interface định nghĩa các phương thức gRPC của metrics-service
 * MetricsReportsService cung cấp 8 RPC: 4 báo cáo snapshot + 4 báo cáo trend
 */
interface MetricsReportsGrpcService {
  GetInventoryStatus(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetMaterialUsage(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetQcPerformance(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetAuditReport(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    size?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetInventoryTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetMaterialUsageTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetQcTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
  GetAuditTrend(data: {
    from?: string;
    to?: string;
    interval?: string;
    limit?: number;
    page?: number;
    warehouse_id?: string;
  }): Observable<any>;
}

/**
 * ReportsController — xử lý các HTTP request /reports/*
 * Gọi gRPC đến metrics-service để lấy dữ liệu báo cáo
 * Mặc định yêu cầu role MANAGER hoặc IT_ADMINISTRATOR
 */
@Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR)
@Controller("reports")
export class ReportsController implements OnModuleInit {
  private readonly logger = new Logger(ReportsController.name);
  private metricsService: MetricsReportsGrpcService;  // gRPC client đến metrics-service

  constructor(
    // Inject gRPC client đã đăng ký trong GrpcModule
    @Inject(METRICS_SERVICE_TOKEN) private readonly client: ClientGrpc,
  ) {}

  /**
   * Lifecycle hook — khởi tạo gRPC service client khi module được load
   */
  onModuleInit() {
    this.metricsService = this.client.getService<MetricsReportsGrpcService>(
      "MetricsReportsService",
    );
  }

  /**
   * GET /reports/inventory-status
   * Lấy báo cáo trạng thái tồn kho trong khoảng thời gian
   * Mở rộng quyền: MANAGER, IT_ADMINISTRATOR, OPERATOR đều được truy cập
   */
  @Roles(UserRole.MANAGER, UserRole.IT_ADMINISTRATOR, UserRole.OPERATOR)
  @Get("inventory-status")
  async getInventoryStatus(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetInventoryStatus({
          from,
          to,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/inventory-status] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/material-usage
   * Lấy báo cáo thống kê sử dụng nguyên vật liệu
   */
  @Get("material-usage")
  async getMaterialUsage(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetMaterialUsage({
          from,
          to,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/material-usage] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/qc-performance
   * Lấy báo cáo hiệu suất kiểm tra chất lượng theo nhà cung cấp
   */
  @Get("qc-performance")
  async getQcPerformance(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetQcPerformance({
          from,
          to,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/qc-performance] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/audit
   * Lấy báo cáo kiểm toán với phân trang (page, size)
   */
  @Get("audit")
  async getAuditReport(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("size") size?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetAuditReport({
          from,
          to,
          page: page ? parseInt(page, 10) : 0,
          size: size ? parseInt(size, 10) : 20,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/audit] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/inventory-trend
   * Lấy xu hướng tồn kho theo thời gian (có interval)
   */
  @Get("inventory-trend")
  async getInventoryTrend(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("interval") interval?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetInventoryTrend({
          from,
          to,
          interval,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/inventory-trend] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/material-usage-trend
   * Lấy xu hướng sử dụng nguyên vật liệu theo thời gian
   */
  @Get("material-usage-trend")
  async getMaterialUsageTrend(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("interval") interval?: string,
    @Query("limit") limit?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetMaterialUsageTrend({
          from,
          to,
          interval,
          limit: limit ? parseInt(limit, 10) : undefined,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/material-usage-trend] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/qc-trend
   * Lấy xu hướng kiểm tra chất lượng theo thời gian
   */
  @Get("qc-trend")
  async getQcTrend(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("interval") interval?: string,
    @Query("limit") limit?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetQcTrend({
          from,
          to,
          interval,
          limit: limit ? parseInt(limit, 10) : undefined,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/qc-trend] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }

  /**
   * GET /reports/audit-trend
   * Lấy xu hướng kiểm toán theo thời gian
   */
  @Get("audit-trend")
  async getAuditTrend(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("interval") interval?: string,
    @Query("warehouse_id") warehouseId?: string,
  ) {
    try {
      return await firstValueFrom(
        this.metricsService.GetAuditTrend({
          from,
          to,
          interval,
          warehouse_id: warehouseId,
        }),
      );
    } catch (err) {
      const e: any = err;
      const msg = e?.message ?? String(err);
      this.logger.error(`[GET /reports/audit-trend] ${msg}`);
      throw new InternalServerErrorException("metrics-service unavailable");
    }
  }
}
