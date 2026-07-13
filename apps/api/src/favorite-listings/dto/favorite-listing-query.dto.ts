import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

function toListingIdArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value) ? value : String(value).split(',');
  const uniqueValues = values
    .map((item) => String(item).trim())
    .filter(Boolean);

  return Array.from(new Set(uniqueValues));
}

export class FavoriteListingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 24;
}

export class FavoriteListingIdsQueryDto {
  @Transform(({ value }) => toListingIdArray(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  listingIds: string[];
}
