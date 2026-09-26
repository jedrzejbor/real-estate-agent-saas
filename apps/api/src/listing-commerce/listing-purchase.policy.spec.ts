import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import {
  assertCanPurchaseListingProducts,
  ListingPurchaseContext,
  ListingProductUnavailableError,
} from './listing-purchase.policy';
import { ListingProductType } from './listing-commerce.types';

function context(
  overrides: Partial<ListingPurchaseContext> = {},
): ListingPurchaseContext {
  return {
    listingStatus: ListingStatus.DRAFT,
    publicationStatus: ListingPublicationStatus.DRAFT,
    publishedAt: null,
    expiresAt: null,
    moderationStatus: PublicListingSubmissionStatus.APPROVED,
    hasLegacyAdminApproval: false,
    now: new Date('2026-09-07T10:00:00.000Z'),
    ...overrides,
  };
}

describe('listing purchase policy', () => {
  it('allows first publication only after approved moderation', () => {
    expect(() =>
      assertCanPurchaseListingProducts(context(), [
        ListingProductType.PUBLICATION,
      ]),
    ).not.toThrow();
    expect(() =>
      assertCanPurchaseListingProducts(
        context({
          moderationStatus: PublicListingSubmissionStatus.IN_REVIEW,
        }),
        [ListingProductType.PUBLICATION],
      ),
    ).toThrow(ListingProductUnavailableError);
  });

  it('supports the legacy claimed plus admin approval state during migration', () => {
    expect(() =>
      assertCanPurchaseListingProducts(
        context({
          moderationStatus: PublicListingSubmissionStatus.CLAIMED,
          hasLegacyAdminApproval: true,
        }),
        [ListingProductType.PUBLICATION],
      ),
    ).not.toThrow();
  });

  it('rejects another publication for a public listing', () => {
    expect(() =>
      assertCanPurchaseListingProducts(
        context({
          listingStatus: ListingStatus.ACTIVE,
          publicationStatus: ListingPublicationStatus.PUBLISHED,
        }),
        [ListingProductType.PUBLICATION],
      ),
    ).toThrow('Ogłoszenie jest już opublikowane');
  });

  it('allows featured only for a non-expired active public listing', () => {
    const active = context({
      listingStatus: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      expiresAt: new Date('2026-10-01T10:00:00.000Z'),
    });
    expect(() =>
      assertCanPurchaseListingProducts(active, [ListingProductType.FEATURED]),
    ).not.toThrow();
    expect(() =>
      assertCanPurchaseListingProducts(
        { ...active, expiresAt: new Date('2026-09-01T10:00:00.000Z') },
        [ListingProductType.FEATURED],
      ),
    ).toThrow('Wyróżnić można wyłącznie aktywne');
  });

  it('requires publication history for a renewal', () => {
    expect(() =>
      assertCanPurchaseListingProducts(context(), [ListingProductType.RENEWAL]),
    ).toThrow('nie było jeszcze opublikowane');
  });

  it('rejects duplicate product types and publication with renewal', () => {
    expect(() =>
      assertCanPurchaseListingProducts(context(), [
        ListingProductType.PUBLICATION,
        ListingProductType.PUBLICATION,
      ]),
    ).toThrow('tylko jeden produkt danego rodzaju');

    expect(() =>
      assertCanPurchaseListingProducts(
        context({ publishedAt: new Date('2026-08-01T10:00:00.000Z') }),
        [ListingProductType.PUBLICATION, ListingProductType.RENEWAL],
      ),
    ).toThrow('nie mogą znaleźć się w tej samej wycenie');
  });
});
