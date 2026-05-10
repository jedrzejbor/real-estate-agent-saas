import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import {
  CreateProductFeedbackDto,
  CreatePublicProductFeedbackDto,
  ProductFeedbackAdminQueryDto,
  UpdateProductFeedbackDto,
} from './dto';
import { ProductFeedbackService } from './product-feedback.service';

@Controller('product-feedback')
export class ProductFeedbackController {
  constructor(
    private readonly productFeedbackService: ProductFeedbackService,
  ) {}

  /** POST /api/product-feedback — capture product feedback from an authenticated user. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductFeedbackDto,
  ) {
    return this.productFeedbackService.createForUser(userId, dto);
  }

  /** POST /api/product-feedback/public — capture lightweight public product feedback. */
  @Public()
  @Post('public')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createPublic(
    @Body() dto: CreatePublicProductFeedbackDto,
    @Req() request: Request,
  ) {
    return this.productFeedbackService.createPublic(dto, request);
  }
}

@Controller('admin/product-feedback')
export class AdminProductFeedbackController {
  constructor(
    private readonly productFeedbackService: ProductFeedbackService,
  ) {}

  /** GET /api/admin/product-feedback — list product feedback for triage. */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAllForAdmin(@Query() query: ProductFeedbackAdminQueryDto) {
    return this.productFeedbackService.findAllForAdmin(query);
  }

  /** GET /api/admin/product-feedback/:id — get single feedback item for triage. */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOneForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const feedback = await this.productFeedbackService.findOneForAdmin(id);

    if (!feedback) {
      throw new NotFoundException('Feedback nie znaleziony');
    }

    return feedback;
  }

  /** PATCH /api/admin/product-feedback/:id — update triage status/metadata. */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async updateForAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductFeedbackDto,
  ) {
    return this.productFeedbackService.updateForAdmin(id, dto);
  }
}
