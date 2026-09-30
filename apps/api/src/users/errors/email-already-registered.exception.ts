import { ConflictException } from '@nestjs/common';

/** Distinguishes an email collision from other registration transaction conflicts. */
export class EmailAlreadyRegisteredException extends ConflictException {
  constructor() {
    super('Użytkownik z tym adresem email już istnieje');
  }
}
