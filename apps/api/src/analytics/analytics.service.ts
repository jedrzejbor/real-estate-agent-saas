import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    private readonly usersService: UsersService,
  ) {}

  async track(userId: string, dto: CreateAnalyticsEventDto) {
    const access = await this.usersService.getAgencyAccessContext(userId);

    const event = this.analyticsEventRepo.create({
      name: dto.name,
      userId,
      agentId: access.agent?.id ?? null,
      agencyId: access.agency?.id ?? null,
      planCode: access.entitlements.plan.code,
      path: dto.path ?? null,
      properties: dto.properties ?? {},
    });

    const savedEvent = await this.analyticsEventRepo.save(event);

    this.logger.debug(
      `Analytics event tracked: ${savedEvent.name} (${savedEvent.id})`,
    );

    return {
      id: savedEvent.id,
      name: savedEvent.name,
      createdAt: savedEvent.createdAt,
    };
  }
}
