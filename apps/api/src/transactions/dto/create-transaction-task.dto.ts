import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TransactionTaskPriority,
  TransactionTaskStatus,
} from '../../common/enums';

export class CreateTransactionTaskDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsEnum(TransactionTaskStatus)
  status?: TransactionTaskStatus;

  @IsOptional()
  @IsEnum(TransactionTaskPriority)
  priority?: TransactionTaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
