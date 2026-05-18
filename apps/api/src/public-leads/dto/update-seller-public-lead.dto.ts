import { IsEnum } from 'class-validator';
import { PublicLeadStatus } from '../../common/enums';

export class UpdateSellerPublicLeadDto {
  @IsEnum(PublicLeadStatus)
  status: PublicLeadStatus.CONTACTED | PublicLeadStatus.ARCHIVED;
}
