import { IsIn, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export class RequestListingRefundDto {
  @IsUUID()
  paymentId: string;

  @Matches(/^[A-Za-z0-9_-]{1,128}$/)
  intentKey: string;

  @IsIn(['full', 'partial'])
  kind: 'full' | 'partial';

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor: number;
}
