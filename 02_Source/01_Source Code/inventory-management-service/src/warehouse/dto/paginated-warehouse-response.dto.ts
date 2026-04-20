import { WarehouseResponseDto } from './warehouse-response.dto';

export class PaginatedWarehouseResponseDto {
  data: WarehouseResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
