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
  ProductFeedbackMyQueryDto,
  UpdateProductFeedbackDto,
  CreateFeatureSurveyDto,
  SubmitFeatureSurveyResponseDto,
  SubmitPublicFeatureSurveyResponseDto,
  UpdateFeatureSurveyDto,
} from './dto';
import { FeatureSurveysService } from './feature-surveys.service';
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

  /** GET /api/product-feedback/my — list feedback submitted by the current user. */
  @Get('my')
  async findMy(
    @CurrentUser('id') userId: string,
    @Query() query: ProductFeedbackMyQueryDto,
  ) {
    return this.productFeedbackService.findMy(userId, query);
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

@Controller('feature-surveys')
export class FeatureSurveysController {
  constructor(private readonly featureSurveysService: FeatureSurveysService) {}

  /** GET /api/feature-surveys/active — active surveys for authenticated users. */
  @Get('active')
  async findActive(@CurrentUser('id') userId: string) {
    return this.featureSurveysService.findActiveForUser(userId);
  }

  /** POST /api/feature-surveys/:id/responses — submit authenticated survey response. */
  @Post(':id/responses')
  @HttpCode(HttpStatus.CREATED)
  async submitResponse(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitFeatureSurveyResponseDto,
  ) {
    return this.featureSurveysService.submitForUser(userId, id, dto);
  }

  /** GET /api/feature-surveys/public/active — active surveys for visitors. */
  @Public()
  @Get('public/active')
  async findActivePublic() {
    return this.featureSurveysService.findActivePublic();
  }

  /** POST /api/feature-surveys/:id/public-responses — submit public survey response. */
  @Public()
  @Post(':id/public-responses')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async submitPublicResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPublicFeatureSurveyResponseDto,
    @Req() request: Request,
  ) {
    return this.featureSurveysService.submitPublic(id, dto, request);
  }
}

@Controller('admin/feature-surveys')
export class AdminFeatureSurveysController {
  constructor(private readonly featureSurveysService: FeatureSurveysService) {}

  /** POST /api/admin/feature-surveys — create product survey. */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createForAdmin(@Body() dto: CreateFeatureSurveyDto) {
    return this.featureSurveysService.createForAdmin(dto);
  }

  /** PATCH /api/admin/feature-surveys/:id — update product survey. */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async updateForAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureSurveyDto,
  ) {
    return this.featureSurveysService.updateForAdmin(id, dto);
  }

  /** GET /api/admin/feature-surveys/:id/responses — list survey responses. */
  @Get(':id/responses')
  @Roles(UserRole.ADMIN)
  async findResponsesForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureSurveysService.findResponsesForAdmin(id);
  }
}
