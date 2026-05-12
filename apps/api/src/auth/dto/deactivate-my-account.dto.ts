import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DeactivateMyAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Hasło jest wymagane' })
  password: string;

  @IsString()
  @Matches(/^USUŃ KONTO$/, {
    message: 'Wpisz dokładnie: USUŃ KONTO',
  })
  confirmation: string;
}
