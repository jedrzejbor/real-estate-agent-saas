import type {
  ListingQuoteContract,
  ListingQuoteRequestItemContract,
} from './contracts';
import { ListingProductCatalog } from './entities';
import {
  assertListingProductConfiguration,
  buildListingProductFulfillmentParameters,
  calculateGrossAmountTotals,
  getListingQuoteExpiry,
  LISTING_COMMERCE_CURRENCY,
} from './listing-commerce.policy';

export interface BuildListingQuoteInput {
  listingId: string;
  requestedItems: readonly ListingQuoteRequestItemContract[];
  productsByCode: ReadonlyMap<string, ListingProductCatalog>;
  quotedAt: Date;
}

const MAX_PERSISTED_GROSS_AMOUNT = 2_147_483_647;

/**
 * Builds an immutable pricing snapshot exclusively from server-side products.
 * Client input selects products and quantities, never monetary values.
 */
export function buildListingQuote(
  input: BuildListingQuoteInput,
): ListingQuoteContract {
  const items = input.requestedItems.map((requestedItem) => {
    const product = input.productsByCode.get(requestedItem.productCode);
    if (!product) {
      throw new RangeError(`unknown product: ${requestedItem.productCode}`);
    }

    assertListingProductConfiguration(product);
    const totals = calculateGrossAmountTotals([
      {
        unitGrossAmount: product.priceGrossAmount,
        quantity: requestedItem.quantity,
        discountGrossAmount: 0,
      },
    ]);

    return {
      productCode: product.code,
      productName: product.name,
      productType: product.type,
      quantity: requestedItem.quantity,
      unitGrossAmount: product.priceGrossAmount,
      ...totals,
      vatRateBasisPoints: product.vatRateBasisPoints ?? null,
      vatGrossAmount: calculateVatIncludedInGross(
        totals.totalGrossAmount,
        product.vatRateBasisPoints ?? null,
      ),
      durationDays: product.durationDays,
      fulfillmentParameters: buildListingProductFulfillmentParameters(product),
    };
  });

  const totals = calculateGrossAmountTotals(
    items.map((item) => ({
      unitGrossAmount: item.unitGrossAmount,
      quantity: item.quantity,
      discountGrossAmount: item.discountGrossAmount,
    })),
  );
  const vatGrossAmount = items.every((item) => item.vatGrossAmount !== null)
    ? items.reduce((sum, item) => sum + (item.vatGrossAmount ?? 0), 0)
    : null;
  if (
    totals.subtotalGrossAmount > MAX_PERSISTED_GROSS_AMOUNT ||
    totals.discountGrossAmount > MAX_PERSISTED_GROSS_AMOUNT ||
    totals.totalGrossAmount > MAX_PERSISTED_GROSS_AMOUNT
  ) {
    throw new RangeError('quote totals exceed the persistence range');
  }

  return {
    listingId: input.listingId,
    currency: LISTING_COMMERCE_CURRENCY,
    quotedAt: input.quotedAt.toISOString(),
    expiresAt: getListingQuoteExpiry(input.quotedAt).toISOString(),
    items,
    discounts: [],
    ...totals,
    vatGrossAmount,
  };
}

/** Returns the VAT portion already included in a gross amount, rounded half-up. */
export function calculateVatIncludedInGross(
  grossAmount: number,
  vatRateBasisPoints: number | null,
): number | null {
  if (vatRateBasisPoints === null) return null;
  if (!Number.isSafeInteger(grossAmount) || grossAmount < 0) {
    throw new RangeError('grossAmount must be a non-negative safe integer');
  }
  if (
    !Number.isSafeInteger(vatRateBasisPoints) ||
    vatRateBasisPoints < 0 ||
    vatRateBasisPoints > 10_000
  ) {
    throw new RangeError('vatRateBasisPoints must be between 0 and 10000');
  }

  const numerator = BigInt(grossAmount) * BigInt(vatRateBasisPoints);
  const denominator = BigInt(10_000 + vatRateBasisPoints);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = quotient + (remainder * 2n >= denominator ? 1n : 0n);
  const result = Number(rounded);

  if (!Number.isSafeInteger(result)) {
    throw new RangeError('vatGrossAmount exceeds safe integer range');
  }
  return result;
}
