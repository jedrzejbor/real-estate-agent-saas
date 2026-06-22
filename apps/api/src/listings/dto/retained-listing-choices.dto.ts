import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class SaveRetainedListingChoicesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  listingIds: string[];
}
