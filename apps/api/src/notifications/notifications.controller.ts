import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('preferences')
  async findPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.findPreferences(userId);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto.preferences);
  }

  @Post('read')
  async markRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationsService.markAsRead(userId, dto.ids);
  }
}
