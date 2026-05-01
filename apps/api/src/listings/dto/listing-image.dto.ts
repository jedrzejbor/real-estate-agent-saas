import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateListingImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
}

export class ReorderListingImagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  imageIds: string[];
}
