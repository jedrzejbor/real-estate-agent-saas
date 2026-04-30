import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyPublicListingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  token: string;
}
