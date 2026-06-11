import { BadRequestException } from '@nestjs/common';
import { ListingCommissionType } from '../common/enums';
import {
  calculateTransactionCommissionAmount,
  normalizeTransactionCommissionInput,
} from './transaction-commission';

describe('transaction commission helpers', () => {
  it('normalizes empty commission to null values', () => {
    expect(normalizeTransactionCommissionInput({})).toEqual({
      commissionType: null,
      commissionValue: null,
    });
  });

  it('calculates percentage commission from deal value', () => {
    expect(
      calculateTransactionCommissionAmount({
        dealValue: '850000.00',
        commissionType: ListingCommissionType.PERCENTAGE,
        commissionValue: '2.50',
      }),
    ).toBe(21250);
  });

  it('calculates fixed commission', () => {
    expect(
      calculateTransactionCommissionAmount({
        dealValue: '850000.00',
        commissionType: ListingCommissionType.FIXED,
        commissionValue: '15000.00',
      }),
    ).toBe(15000);
  });

  it('rejects value without type', () => {
    expect(() =>
      normalizeTransactionCommissionInput({ commissionValue: 5000 }),
    ).toThrow(BadRequestException);
  });

  it('rejects percentage above 100%', () => {
    expect(() =>
      normalizeTransactionCommissionInput({
        commissionType: ListingCommissionType.PERCENTAGE,
        commissionValue: 100.01,
      }),
    ).toThrow(BadRequestException);
  });
});
