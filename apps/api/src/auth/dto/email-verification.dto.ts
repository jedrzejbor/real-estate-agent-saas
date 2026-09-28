import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestAccountEmailVerificationDto {
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  @IsNotEmpty({ message: 'Email jest wymagany' })
  email: string;
}

export class ConfirmAccountEmailVerificationDto {
  @IsString()
  @Matches(/^[0-9a-f]{64}$/, {
    message: 'Link weryfikacyjny jest nieprawidłowy',
  })
  token: string;
}
