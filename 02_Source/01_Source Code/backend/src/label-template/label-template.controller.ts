import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { LabelTemplateService } from './label-template.service';
import {
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  GenerateLabelDto,
  LabelTypeValues,
  LabelType,
} from './label-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

/**
 * LabelTemplate Controller
 * REST API: /api/label-templates
 */
@Controller('label-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabelTemplateController {
  constructor(private readonly service: LabelTemplateService) {}

  /**
   * GET /label-templates
   * List all templates with pagination
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.service.findAll(page, limit);
  }

  /**
   * GET /label-templates/search?q=query
   * Search by template_id or template_name
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get('search')
  @HttpCode(HttpStatus.OK)
  search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    if (!query) {
      throw new BadRequestException('Search query parameter (q) is required');
    }
    return this.service.search(query, page, limit);
  }

  /**
   * GET /label-templates/types
   * Get all available label types
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get('types')
  @HttpCode(HttpStatus.OK)
  getTypes() {
    return { types: LabelTypeValues };
  }

  /**
   * GET /label-templates/type/:type
   * Filter templates by label_type
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get('type/:type')
  @HttpCode(HttpStatus.OK)
  filterByType(
    @Param('type') type: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    if (!LabelTypeValues.includes(type as LabelType)) {
      throw new BadRequestException(
        `Invalid label_type. Valid values: ${LabelTypeValues.join(', ')}`,
      );
    }
    return this.service.filterByType(type as LabelType, page, limit);
  }

  /**
   * GET /label-templates/:id
   * Get a single template by MongoDB _id
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /**
   * POST /label-templates
   * Create a new label template
   */
  @Roles(UserRole.MANAGER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateLabelTemplateDto,
  ) {
    return this.service.create(dto);
  }

  /**
   * POST /label-templates/generate
   * Generate a label by populating template with entity data
   */
  @Roles(UserRole.OPERATOR, UserRole.MANAGER)
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(
    @Body(new ValidationPipe({ transform: true }))
    dto: GenerateLabelDto,
  ) {
    return this.service.generateLabel(dto);
  }

  /**
   * PUT /label-templates/:id
   * Update a label template
   */
  @Roles(UserRole.MANAGER)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, skipMissingProperties: true }))
    dto: UpdateLabelTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /label-templates/:id
   * Delete a label template
   */
  @Roles(UserRole.MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
