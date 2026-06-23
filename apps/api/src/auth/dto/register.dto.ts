import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsIn,
} from 'class-validator';
import { AgencyPlan } from '../../common/enums';

export const RegisterAccountType = {
  AGENT: 'agent',
  PRIVATE_SELLER: 'private_seller',
} as const;

export type RegisterAccountTypeValue =
  (typeof RegisterAccountType)[keyof typeof RegisterAccountType];

export class RegisterDto {
  @IsOptional()
  @IsIn(Object.values(RegisterAccountType), {
    message: 'Nieprawidłowy typ konta',
  })
  accountType?: RegisterAccountTypeValue;

  @IsOptional()
  @IsIn(
    [
      AgencyPlan.FREE,
      AgencyPlan.STARTER,
      AgencyPlan.PROFESSIONAL,
      AgencyPlan.ENTERPRISE,
    ],
    {
      message: 'Nieprawidłowy plan',
    },
  )
  selectedPlan?: Exclude<AgencyPlan, AgencyPlan.CUSTOM>;

  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  @IsNotEmpty({ message: 'Email jest wymagany' })
  email: string;

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
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;
}
