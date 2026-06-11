import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingCommissionType, TransactionStatus } from '../../common/enums';

export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  buyerClientId?: string;

  @IsOptional()
  @IsUUID()
  sellerClientId?: string | null;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  dealValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(ListingCommissionType)
  commissionType?: ListingCommissionType | null;

  @ValidateIf((dto: UpdateTransactionDto) => dto.commissionValue !== null)
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  commissionValue?: number | null;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;

  @IsOptional()
  @IsDateString()
  reservationExpiresAt?: string | null;

  @IsOptional()
  @IsDateString()
  preliminaryAgreementDate?: string | null;

  @IsOptional()
  @IsDateString()
  financingDeadline?: string | null;

  @IsOptional()
  @IsDateString()
  notaryDate?: string | null;

  @IsOptional()
  @IsDateString()
  handoverDate?: string | null;

  @IsOptional()
  @IsDateString()
  commissionDueDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  blockerNote?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  privateNote?: string | null;
}
