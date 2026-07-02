import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users';
import { Listing } from '../listings/entities/listing.entity';
import { MonitoringModule } from '../monitoring';
import { Agent } from '../users/entities/agent.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';
import {
  AdminAnalyticsController,
  AnalyticsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from './entities/analytics-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, Listing, Agent, BlogPost]),
    UsersModule,
    MonitoringModule,
  ],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
