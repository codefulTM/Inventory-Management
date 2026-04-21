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

@Controller('inventory-adjustments')
@UseGuards(RolesGuard)
export class InventoryAdjustmentController {
  constructor(private readonly service: InventoryAdjustmentService) {}

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

  @Post()
  @Roles(UserRole.MANAGER)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Body() dto: CreateInventoryAdjustmentDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const requester = this.toRequester(req);
    return this.service.create(dto, requester);
  }

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

  @Get(':id')
  @Roles(UserRole.MANAGER)
  async findOne(@Param('id') adjustmentId: string) {
    return this.service.findOne(adjustmentId);
  }
}
