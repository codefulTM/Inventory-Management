import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { BinWorklistService } from './bin-worklist.service';
import { BinWorklistQueryDto, SubmitBinCountDto } from './dto/bin-worklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Controller quản lý Bin (Vị trí lưu kho / Storage Location)
 * 
 * Bin là vị trí lưu kho cụ thể (zone -> rack -> bin)
 * Mỗi bin có thể chứa nhiều lô hàng (lots) của các vật tư khác nhau
 * 
 * Định tuyến: /bins
 * Bảo vệ bởi: JwtAuthGuard + RolesGuard
 */
@Controller('bins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BinWorklistController {
  constructor(private readonly service: BinWorklistService) {}

  /**
   * GET /bins/worklist
   * Lấy danh sách Bin (vị trí lưu kho) có phân trang
   * 
   * Query params:
   * - warehouse_id: Lọc theo kho (tùy chọn)
   * - q: Từ khóa tìm kiếm theo bin_code hoặc location_name (tùy chọn)
   * - page: Số trang (mặc định: 1)
   * - limit: Số bản ghi/trang (mặc định: 50)
   * 
   * Trả về: Danh sách bins kèm thông tin lô hàng trong bin và lần đếm cuối
   */
  @Get('worklist')
  async getWorklist(@Query() query: BinWorklistQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    return await this.service.getWorklist(query.warehouse_id, page, limit, query.q);
  }

  /**
   * GET /bins/:bin_code
   * Lấy chi tiết một Bin và danh sách các lô hàng trong bin đó
   * 
   * @param bin_code - Mã bin (location_id)
   * @returns Thông tin bin và danh sách lots
   */
  @Get(':bin_code')
  async getBinDetails(@Param('bin_code') bin_code: string) {
    return await this.service.getBinDetails(bin_code);
  }

  /**
   * GET /bins/:bin_code/counts
   * Lấy lịch sử đếm tồn kho của một bin (có phân trang)
   * 
   * @param bin_code - Mã bin
   * @param page - Số trang (mặc định: 1)
   * @param limit - Số bản ghi/trang (mặc định: 20)
   * @returns Lịch sử đếm kèm thông tin chi tiết (lot, vật tư, số lượng)
   */
  @Get(':bin_code/counts')
  async getBinCounts(
    @Param('bin_code') bin_code: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    return await this.service.getBinCounts(bin_code, p, l);
  }

  /**
   * POST /bins/:bin_code/counts
   * Gửi kết quả đếm tồn kho tại một bin
   * 
   * Quy trình:
   * 1. So sánh số lượng đếm được với số lượng kỳ vọng
   * 2. Tính phần trăm chênh lệch
   * 3. Nếu chênh lệch >= 50% hoặc có bất thường -> Flag để review
   * 4. Ghi log kiểm toán
   * 5. Nếu flag_review -> Gửi email thông báo cho Manager
   * 6. Nếu chênh lệch nhỏ và được bật AUTO_ADJUST -> Tự động tạo Warehouse Slip điều chỉnh
   * 
   * @param bin_code - Mã bin
   * @param dto - Dữ liệu kết quả đếm (counted_by, entries: lot_id, counted_qty, ...)
   * @returns Thông tin bản ghi đã lưu + flag_review + độ lệch delta_pct
   */
  @Post(':bin_code/counts')
  async submitCounts(
    @Param('bin_code') bin_code: string,
    @Body(ValidationPipe) dto: SubmitBinCountDto,
  ) {
    return await this.service.submitCounts(bin_code, dto);
  }

  /**
   * POST /bins
   * Tạo mới một Bin (vị trí lưu kho)
   * 
   * Body: { bin_code, warehouse_id, location_name, expected_qty }
   * Nếu không có warehouse_id sẽ dùng DEFAULT_WAREHOUSE_ID từ config
   * 
   * @returns Thông tin bin vừa tạo (upsert: tạo mới hoặc giữ nguyên nếu đã tồn tại)
   */
  @Post()
  async createBin(
    @Body()
    body: {
      bin_code: string;
      warehouse_id?: string;
      location_name?: string;
      expected_qty?: number;
    },
  ) {
    return await this.service.createBin(body);
  }

  /**
   * PUT /bins/:bin_code
   * Cập nhật thông tin một Bin
   * 
   * @param bin_code - Mã bin cần cập nhật
   * @param body - Dữ liệu cập nhật (warehouse_id, location_name, is_active, expected_qty)
   * @returns Thông tin bin sau khi cập nhật
   */
  @Put(':bin_code')
  async updateBin(
    @Param('bin_code') bin_code: string,
    @Body()
    body: {
      warehouse_id?: string;
      location_name?: string;
      is_active?: boolean;
      expected_qty?: number;
    },
  ) {
    return await this.service.updateBin(bin_code, body);
  }

  /**
   * DELETE /bins/:bin_code
   * Xóa một Bin khỏi hệ thống
   * 
   * @param bin_code - Mã bin cần xóa
   * @returns { success: boolean }
   */
  @Delete(':bin_code')
  async deleteBin(@Param('bin_code') bin_code: string) {
    return await this.service.deleteBin(bin_code);
  }
}
