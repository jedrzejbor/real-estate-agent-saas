import { BadRequestException } from '@nestjs/common';
import { ListingCommissionType } from '../common/enums';

interface ListingCommissionInput {
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | string | null;
}

interface NormalizeListingCommissionOptions {
  current?: ListingCommissionInput;
  partial?: boolean;
}

export interface NormalizedListingCommission {
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | null;
}

interface ListingCommissionCalculationInput {
  price?: number | string | null;
  commissionType?: ListingCommissionType | null;
  commissionValue?: number | string | null;
}

export function normalizeListingCommissionInput(
  input: ListingCommissionInput,
  options: NormalizeListingCommissionOptions = {},
): NormalizedListingCommission {
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

  const commissionValue = parseCommissionValue(rawValue);

  if (commissionValue === null) {
    throw new BadRequestException(
      'Wartość prowizji jest wymagana, jeśli podano typ prowizji',
    );
  }

  if (commissionType === ListingCommissionType.PERCENTAGE) {
    if (commissionValue > 100) {
      throw new BadRequestException(
        'Prowizja procentowa nie może być większa niż 100%',
      );
    }

    return { commissionType, commissionValue };
  }

  if (commissionType === ListingCommissionType.FIXED) {
    return { commissionType, commissionValue };
  }

  throw new BadRequestException('Nieprawidłowy typ prowizji');
}

export function calculateListingCommissionAmount(
  listing: ListingCommissionCalculationInput,
): number | null {
  const price = parseCommissionValue(listing.price);
  const commissionValue = parseCommissionValue(listing.commissionValue);

  if (!listing.commissionType || price === null || commissionValue === null) {
    return null;
  }

  if (listing.commissionType === ListingCommissionType.PERCENTAGE) {
    return roundMoney((price * commissionValue) / 100);
  }

  if (listing.commissionType === ListingCommissionType.FIXED) {
    return roundMoney(commissionValue);
  }

  return null;
}

function parseCommissionValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('Wartość prowizji musi być liczbą dodatnią');
  }

  return parsed;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
