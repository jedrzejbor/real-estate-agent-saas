import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics';
import { UsersModule } from '../users';
import { ProductFeedback } from './entities';
import { ProductFeedbackController } from './product-feedback.controller';
import { ProductFeedbackService } from './product-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductFeedback]),
    AnalyticsModule,
    UsersModule,
  ],
  controllers: [ProductFeedbackController],
  providers: [ProductFeedbackService],
  exports: [TypeOrmModule, ProductFeedbackService],
})
export class ProductFeedbackModule {}
