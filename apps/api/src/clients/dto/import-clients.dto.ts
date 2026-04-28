import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClientDto } from './create-client.dto';

export class ImportClientsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Import musi zawierać co najmniej jeden wiersz' })
  @ArrayMaxSize(100, {
    message: 'Jednorazowo można zaimportować maksymalnie 100 klientów',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateClientDto)
  rows: CreateClientDto[];
}
