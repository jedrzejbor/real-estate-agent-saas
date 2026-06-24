import { getMetadataArgsStorage } from 'typeorm';
import { Appointment } from './entities/appointment.entity';

describe('Appointment relation column mapping', () => {
  it('maps relation ids to snake_case database columns used by joins', () => {
    expect(getColumnDatabaseName('agentId')).toBe('agent_id');
    expect(getColumnDatabaseName('clientId')).toBe('client_id');
    expect(getColumnDatabaseName('listingId')).toBe('listing_id');
  });

  it('keeps relation join columns aligned with relation id columns', () => {
    expect(getJoinColumnDatabaseName('agent')).toBe(
      getColumnDatabaseName('agentId'),
    );
    expect(getJoinColumnDatabaseName('client')).toBe(
      getColumnDatabaseName('clientId'),
    );
    expect(getJoinColumnDatabaseName('listing')).toBe(
      getColumnDatabaseName('listingId'),
    );
  });

  it('allows appointments without client or listing while preserving ids when present', () => {
    expect(getColumnNullable('clientId')).toBe(true);
    expect(getColumnNullable('listingId')).toBe(true);
  });
});

function getColumnDatabaseName(propertyName: keyof Appointment): string {
  const column = getMetadataArgsStorage().columns.find(
    (item) => item.target === Appointment && item.propertyName === propertyName,
  );

  if (!column) {
    throw new Error(`Column metadata not found for ${String(propertyName)}`);
  }

  return column.options.name ?? column.propertyName;
}

function getColumnNullable(propertyName: keyof Appointment): boolean {
  const column = getMetadataArgsStorage().columns.find(
    (item) => item.target === Appointment && item.propertyName === propertyName,
  );

  if (!column) {
    throw new Error(`Column metadata not found for ${String(propertyName)}`);
  }

  return column.options.nullable === true;
}

function getJoinColumnDatabaseName(propertyName: keyof Appointment): string {
  const joinColumn = getMetadataArgsStorage().joinColumns.find(
    (item) => item.target === Appointment && item.propertyName === propertyName,
  );

  if (!joinColumn) {
    throw new Error(
      `Join column metadata not found for ${String(propertyName)}`,
    );
  }

  return joinColumn.name ?? joinColumn.propertyName;
}
