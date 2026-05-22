import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyPublicListingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  token: string;
}

export class ClaimPublicListingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  claimToken: string;
}

export class RejectPublicListingSubmissionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}
