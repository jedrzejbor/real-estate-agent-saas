import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics';
import { UsersModule } from '../users';
import {
  FeatureSurvey,
  FeatureSurveyResponse,
  ProductFeedback,
} from './entities';
import { FeatureSurveysService } from './feature-surveys.service';
import {
  AdminFeatureSurveysController,
  AdminProductFeedbackController,
  FeatureSurveysController,
  ProductFeedbackController,
} from './product-feedback.controller';
import { ProductFeedbackService } from './product-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductFeedback,
      FeatureSurvey,
      FeatureSurveyResponse,
    ]),
    AnalyticsModule,
    UsersModule,
  ],
  controllers: [
    ProductFeedbackController,
    AdminProductFeedbackController,
    FeatureSurveysController,
    AdminFeatureSurveysController,
  ],
  providers: [ProductFeedbackService, FeatureSurveysService],
  exports: [TypeOrmModule, ProductFeedbackService, FeatureSurveysService],
})
export class ProductFeedbackModule {}
