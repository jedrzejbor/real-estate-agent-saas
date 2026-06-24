import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAppointmentFollowUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}
