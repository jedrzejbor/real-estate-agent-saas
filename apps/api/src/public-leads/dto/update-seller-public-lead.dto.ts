import { IsIn } from 'class-validator';
import { PublicLeadStatus } from '../../common/enums';

export const SELLER_PUBLIC_LEAD_STATUSES = [
  PublicLeadStatus.NEW,
  PublicLeadStatus.CONTACTED,
  PublicLeadStatus.QUALIFIED,
  PublicLeadStatus.SPAM,
  PublicLeadStatus.ARCHIVED,
] as const;

export type SellerPublicLeadStatus =
  (typeof SELLER_PUBLIC_LEAD_STATUSES)[number];

export class UpdateSellerPublicLeadDto {
  @IsIn(SELLER_PUBLIC_LEAD_STATUSES)
  status: SellerPublicLeadStatus;
}
