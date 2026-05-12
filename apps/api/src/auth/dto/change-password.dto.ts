import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Obecne hasło jest wymagane' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Hasło musi mieć co najmniej 8 znaków' })
  @MaxLength(128, { message: 'Hasło może mieć maksymalnie 128 znaków' })
  @Matches(/(?=.*[a-z])/, {
    message: 'Hasło musi zawierać co najmniej jedną małą literę',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Hasło musi zawierać co najmniej jedną wielką literę',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Hasło musi zawierać co najmniej jedną cyfrę',
  })
  newPassword: string;
}
