import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  TaskPriority,
  TaskRelatedEntityType,
  TaskStatus,
  TaskType,
} from '../../common/enums';

export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskRelatedEntityType)
  relatedEntityType?: TaskRelatedEntityType | null;

  @IsOptional()
  @IsUUID('4')
  relatedEntityId?: string | null;

  @IsOptional()
  @IsUUID('4')
  appointmentId?: string | null;

  @IsOptional()
  @IsUUID('4')
  clientId?: string | null;

  @IsOptional()
  @IsUUID('4')
  listingId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}
