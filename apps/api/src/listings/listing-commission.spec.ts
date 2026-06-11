import { BadRequestException } from '@nestjs/common';
import { ListingCommissionType } from '../common/enums';
import {
  calculateListingCommissionAmount,
  normalizeListingCommissionInput,
} from './listing-commission';

describe('listing commission helpers', () => {
  it('normalizes empty commission to null values', () => {
    expect(normalizeListingCommissionInput({})).toEqual({
      commissionType: null,
      commissionValue: null,
    });
  });

  it('accepts a percentage commission up to 100%', () => {
    expect(
      normalizeListingCommissionInput({
        commissionType: ListingCommissionType.PERCENTAGE,
        commissionValue: 2.5,
      }),
    ).toEqual({
      commissionType: ListingCommissionType.PERCENTAGE,
      commissionValue: 2.5,
    });
  });

  it('rejects percentage commission above 100%', () => {
    expect(() =>
      normalizeListingCommissionInput({
        commissionType: ListingCommissionType.PERCENTAGE,
        commissionValue: 100.01,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects commission value without commission type', () => {
    expect(() =>
      normalizeListingCommissionInput({
        commissionValue: 5000,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects commission type without commission value', () => {
    expect(() =>
      normalizeListingCommissionInput({
        commissionType: ListingCommissionType.FIXED,
      }),
    ).toThrow(BadRequestException);
  });

  it('preserves current type when partially updating only the value', () => {
    expect(
      normalizeListingCommissionInput(
        {
          commissionValue: 3,
        },
        {
          partial: true,
          current: {
            commissionType: ListingCommissionType.PERCENTAGE,
            commissionValue: 2,
          },
        },
      ),
    ).toEqual({
      commissionType: ListingCommissionType.PERCENTAGE,
      commissionValue: 3,
    });
  });

  it('calculates percentage commission amount', () => {
    expect(
      calculateListingCommissionAmount({
        price: '850000.00',
        commissionType: ListingCommissionType.PERCENTAGE,
        commissionValue: '2.50',
      }),
    ).toBe(21250);
  });

  it('calculates fixed commission amount', () => {
    expect(
      calculateListingCommissionAmount({
        price: '850000.00',
        commissionType: ListingCommissionType.FIXED,
        commissionValue: '15000.00',
      }),
    ).toBe(15000);
  });
});
