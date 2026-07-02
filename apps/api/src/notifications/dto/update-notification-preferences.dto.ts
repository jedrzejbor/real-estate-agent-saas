import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '../notification-categories';

export class NotificationPreferenceDto {
  @IsIn(NOTIFICATION_CATEGORIES)
  category: NotificationCategory;

  @IsBoolean()
  enabled: boolean;
}

export class NotificationRuleSettingsDto {
  @IsInt()
  @Min(0)
  @Max(30)
  followUpOverdueDays: number;

  @IsInt()
  @Min(1)
  @Max(120)
  staleListingDays: number;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(NOTIFICATION_CATEGORIES.length)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationRuleSettingsDto)
  ruleSettings?: NotificationRuleSettingsDto;
}
