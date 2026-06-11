import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TransactionStatus } from '../../common/enums';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string | null;
}
