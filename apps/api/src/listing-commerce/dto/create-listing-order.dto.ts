import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateListingQuoteDto } from './create-listing-quote.dto';

export class ListingOrderBuyerDto {
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @IsIn(['consumer', 'business'])
  buyerType: 'consumer' | 'business';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ValidateIf((buyer: ListingOrderBuyerDto) => buyer.buyerType === 'business')
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName?: string;

  @ValidateIf((buyer: ListingOrderBuyerDto) => buyer.buyerType === 'business')
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  taxId?: string;
}

export class CreateListingOrderDto extends CreateListingQuoteDto {
  @ValidateNested()
  @Type(() => ListingOrderBuyerDto)
  buyer: ListingOrderBuyerDto;
}
