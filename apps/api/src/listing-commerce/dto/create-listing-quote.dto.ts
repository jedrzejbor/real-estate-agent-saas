import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateListingQuoteItemDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
  productCode: string;

  /** V1 products are bought once per order; extensions are separate orders. */
  @IsInt()
  @Min(1)
  @Max(1)
  quantity: number;
}

export class CreateListingQuoteDto {
  @IsUUID()
  listingId: string;

  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateListingQuoteItemDto)
  items: CreateListingQuoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  promotionCode?: string;
}
