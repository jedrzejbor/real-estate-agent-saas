import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
