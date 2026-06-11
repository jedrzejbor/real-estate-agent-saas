import { BadRequestException } from '@nestjs/common';
import { ListingCommissionType } from '../common/enums';

interface TransactionCommissionInput {
  dealValue?: number | string | null;
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | string | null;
}

interface NormalizeTransactionCommissionOptions {
  current?: TransactionCommissionInput;
  partial?: boolean;
}

export interface NormalizedTransactionCommission {
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | null;
}

export function normalizeTransactionCommissionInput(
  input: TransactionCommissionInput,
  options: NormalizeTransactionCommissionOptions = {},
): NormalizedTransactionCommission {
  const hasType = Object.prototype.hasOwnProperty.call(input, 'commissionType');
  const hasValue = Object.prototype.hasOwnProperty.call(
    input,
    'commissionValue',
  );

  if (options.partial && !hasType && !hasValue) {
    return {};
  }

  const commissionType = hasType
    ? (input.commissionType ?? null)
    : (options.current?.commissionType ?? null);
  const rawValue = hasValue
    ? (input.commissionValue ?? null)
    : (options.current?.commissionValue ?? null);

  if (!commissionType) {
    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      throw new BadRequestException(
        'Typ prowizji jest wymagany, jeśli podano wartość prowizji',
      );
    }

    return {
      commissionType: null,
      commissionValue: null,
    };
  }

  const commissionValue = parseMoneyLikeValue(rawValue, 'Wartość prowizji');

  if (commissionValue === null) {
    throw new BadRequestException(
      'Wartość prowizji jest wymagana, jeśli podano typ prowizji',
    );
  }

  if (
    commissionType === ListingCommissionType.PERCENTAGE &&
    commissionValue > 100
  ) {
    throw new BadRequestException(
      'Prowizja procentowa nie może być większa niż 100%',
    );
  }

  if (
    commissionType !== ListingCommissionType.PERCENTAGE &&
    commissionType !== ListingCommissionType.FIXED
  ) {
    throw new BadRequestException('Nieprawidłowy typ prowizji');
  }

  return { commissionType, commissionValue };
}

export function calculateTransactionCommissionAmount(
  transaction: TransactionCommissionInput,
): number | null {
  const dealValue = parseMoneyLikeValue(
    transaction.dealValue,
    'Wartość transakcji',
  );
  const commissionValue = parseMoneyLikeValue(
    transaction.commissionValue,
    'Wartość prowizji',
  );

  if (
    !transaction.commissionType ||
    dealValue === null ||
    commissionValue === null
  ) {
    return null;
  }

  if (transaction.commissionType === ListingCommissionType.PERCENTAGE) {
    return roundMoney((dealValue * commissionValue) / 100);
  }

  if (transaction.commissionType === ListingCommissionType.FIXED) {
    return roundMoney(commissionValue);
  }

  return null;
}

export function parseMoneyLikeValue(
  value: unknown,
  label: string,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException(`${label} musi być liczbą dodatnią`);
  }

  return parsed;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
