import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import { ListingProductType } from './listing-commerce.types';

export interface ListingPurchaseContext {
  listingStatus: ListingStatus;
  publicationStatus: ListingPublicationStatus;
  publishedAt: Date | null;
  expiresAt: Date | null;
  moderationStatus: PublicListingSubmissionStatus;
  hasLegacyAdminApproval: boolean;
  now: Date;
}

export class ListingProductUnavailableError extends Error {
  constructor(
    readonly productType: ListingProductType,
    message: string,
  ) {
    super(message);
    this.name = 'ListingProductUnavailableError';
  }
}

export function hasApprovedListingModeration(
  context: Pick<
    ListingPurchaseContext,
    'moderationStatus' | 'hasLegacyAdminApproval'
  >,
): boolean {
  return (
    context.moderationStatus === PublicListingSubmissionStatus.APPROVED ||
    context.moderationStatus === PublicListingSubmissionStatus.PUBLISHED ||
    (context.moderationStatus === PublicListingSubmissionStatus.CLAIMED &&
      context.hasLegacyAdminApproval)
  );
}

export function assertCanPurchaseListingProducts(
  context: ListingPurchaseContext,
  productTypes: readonly ListingProductType[],
): void {
  const uniqueTypes = new Set(productTypes);
  if (uniqueTypes.size !== productTypes.length) {
    throw new ListingProductUnavailableError(
      productTypes[0],
      'W jednej wycenie może wystąpić tylko jeden produkt danego rodzaju',
    );
  }
  if (
    uniqueTypes.has(ListingProductType.PUBLICATION) &&
    uniqueTypes.has(ListingProductType.RENEWAL)
  ) {
    throw new ListingProductUnavailableError(
      ListingProductType.PUBLICATION,
      'Publikacja i odnowienie nie mogą znaleźć się w tej samej wycenie',
    );
  }

  if (!hasApprovedListingModeration(context)) {
    throw new ListingProductUnavailableError(
      productTypes[0],
      'Ogłoszenie nie zostało jeszcze zatwierdzone do sprzedaży',
    );
  }

  if (
    [
      ListingStatus.SOLD,
      ListingStatus.RENTED,
      ListingStatus.WITHDRAWN,
      ListingStatus.ARCHIVED,
    ].includes(context.listingStatus)
  ) {
    throw new ListingProductUnavailableError(
      productTypes[0],
      'Produkt nie jest dostępny dla zakończonego ogłoszenia',
    );
  }

  const isActivePublicListing =
    context.listingStatus === ListingStatus.ACTIVE &&
    context.publicationStatus === ListingPublicationStatus.PUBLISHED &&
    (!context.expiresAt || context.expiresAt.getTime() > context.now.getTime());

  for (const productType of productTypes) {
    switch (productType) {
      case ListingProductType.PUBLICATION:
        if (context.publicationStatus === ListingPublicationStatus.PUBLISHED) {
          throw new ListingProductUnavailableError(
            productType,
            'Ogłoszenie jest już opublikowane',
          );
        }
        break;
      case ListingProductType.RENEWAL:
        if (!context.publishedAt) {
          throw new ListingProductUnavailableError(
            productType,
            'Ogłoszenie nie było jeszcze opublikowane i nie może zostać odnowione',
          );
        }
        break;
      case ListingProductType.FEATURED:
        if (!isActivePublicListing) {
          throw new ListingProductUnavailableError(
            productType,
            'Wyróżnić można wyłącznie aktywne, publiczne ogłoszenie',
          );
        }
        break;
    }
  }
}
