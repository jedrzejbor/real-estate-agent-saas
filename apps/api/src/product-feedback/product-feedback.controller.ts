import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreateProductFeedbackDto,
  CreatePublicProductFeedbackDto,
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
