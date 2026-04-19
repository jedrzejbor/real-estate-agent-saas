import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateClientNoteDto {
  @IsNotEmpty({ message: 'Treść notatki jest wymagana' })
  @IsString()
  @MaxLength(5000)
  content: string;
}
