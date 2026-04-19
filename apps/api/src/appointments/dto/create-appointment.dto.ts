import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { AppointmentType } from '../../common/enums';

export class CreateAppointmentDto {
  @IsNotEmpty({ message: 'Tytuł jest wymagany' })
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsEnum(AppointmentType, { message: 'Nieprawidłowy typ spotkania' })
  type?: AppointmentType;

  @IsNotEmpty({ message: 'Data rozpoczęcia jest wymagana' })
  @IsDateString({}, { message: 'Nieprawidłowy format daty rozpoczęcia' })
  startTime: string;

  @IsNotEmpty({ message: 'Data zakończenia jest wymagana' })
  @IsDateString({}, { message: 'Nieprawidłowy format daty zakończenia' })
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy ID klienta' })
  clientId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Nieprawidłowy ID oferty' })
  listingId?: string;
}
