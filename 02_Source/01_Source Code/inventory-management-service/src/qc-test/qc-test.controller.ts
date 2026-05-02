/**
 * QCTestController - Controller quản lý kiểm tra chất lượng
 *
 * Định tuyến: /qc-tests
 * Bảo vệ: JwtAuthGuard + RolesGuard
 *
 * Endpoints chính:
 * - GET /qc-tests/dashboard - Dashboard KPI cho QC
 * - GET /qc-tests/supplier-performance - Thống kê hiệu suất nhà cung cấp
 * - GET /qc-tests - Danh sách tất cả QC tests
 * - POST /qc-tests - Tạo QC test mới
 * - GET /qc-tests/:test_id - Chi tiết QC test
 * - PATCH /qc-tests/:test_id - Cập nhật QC test
 * - DELETE /qc-tests/:test_id - Xóa QC test
 * - POST /qc-tests/:test_id/decision - Ra quyết định QC (Pass/Fail)
 * - POST /qc-tests/:test_id/retest - Gửi yêu cầu test lại
 * - POST /qc-tests/bulk-quarantine - Cách ly hàng loạt
 */
import { UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/decorators/roles.decorator';
import { CurrentUser } from '../common/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/jwt.strategy';
import { UserRole } from '../schemas/user.schema';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QCTestService } from './qc-test.service';
import { CreateQCTestDto } from './dto/create-qc-test.dto';
import { UpdateQCTestDto } from './dto/update-qc-test.dto';
import { QCDecisionDto } from './dto/qc-decision.dto';
import { SubmitRetestDecisionDto } from './dto/submit-retest-decision.dto';

@Controller('qc-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QCTestController {
  constructor(private readonly qcTestService: QCTestService) {}

  // Static routes first — must come before dynamic :test_id route

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Get('dashboard')
  getDashboard() {
    return this.qcTestService.getDashboardKPI();
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Get('supplier-performance')
  getSupplierPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.qcTestService.getSupplierPerformance({ from, to });
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Get()
  getAllTests(
    @Query('result_status') result_status?: string,
    @Query('test_type') test_type?: string,
  ) {
    return this.qcTestService.getAllTests({ result_status, test_type });
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createTest(@Body() dto: CreateQCTestDto) {
    return this.qcTestService.createTest(dto);
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Post('batch/:batch_id/init')
  @HttpCode(HttpStatus.CREATED)
  initTestFromBatch(
    @Param('batch_id') batch_id: string,
    @Body()
    dto: {
      performed_by: string;
      test_type?: CreateQCTestDto['test_type'];
      test_method?: string;
      acceptance_criteria?: string;
    },
  ) {
    return this.qcTestService.initTestFromBatch(batch_id, dto);
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Post('lot/:lot_id/decision')
  @HttpCode(HttpStatus.OK)
  submitDecision(@Param('lot_id') lot_id: string, @Body() dto: QCDecisionDto) {
    return this.qcTestService.submitDecision(lot_id, dto);
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Post('lot/:lot_id/retest')
  @HttpCode(HttpStatus.OK)
  submitRetestDecision(
    @Param('lot_id') lot_id: string,
    @Body() dto: SubmitRetestDecisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const performedBy = user?.username || dto.performed_by;
    if (!performedBy) {
      throw new BadRequestException('performed_by is required');
    }

    return this.qcTestService.submitRetestDecision(lot_id, dto.action, {
      new_expiry_date: dto.new_expiry_date,
      performed_by: performedBy,
    });
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Get('lot/:lot_id')
  getTestsByLotId(@Param('lot_id') lot_id: string) {
    return this.qcTestService.getTestsByLotId(lot_id);
  }

  // Dynamic :test_id routes — must come after all static routes

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Get(':test_id')
  getTestById(@Param('test_id') test_id: string) {
    return this.qcTestService.getTestById(test_id);
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Patch(':test_id')
  updateTest(@Param('test_id') test_id: string, @Body() dto: UpdateQCTestDto) {
    return this.qcTestService.updateTest(test_id, dto);
  }

  @Roles(UserRole.QC_TECHNICIAN, UserRole.MANAGER)
  @Delete(':test_id')
  deleteTest(@Param('test_id') test_id: string) {
    return this.qcTestService.deleteTest(test_id);
  }
}
