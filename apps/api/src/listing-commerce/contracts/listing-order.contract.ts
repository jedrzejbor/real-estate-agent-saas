import type { ListingOrderStatus } from '../listing-commerce.types';
import type {
  ListingQuoteContract,
  ListingQuoteItemContract,
} from './listing-quote.contract';

export interface ListingOrderItemContract extends ListingQuoteItemContract {
  id: string;
  productId: string;
}

export interface ListingOrderContract {
  id: string;
  orderNumber: string;
  listingId: string;
  status: ListingOrderStatus;
  currency: string;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  vatGrossAmount: number | null;
  quoteExpiresAt: string;
  paidAt: string | null;
  requiresPayment: boolean;
  pricingSnapshot: ListingQuoteContract;
  items: ListingOrderItemContract[];
  createdAt: string;
}
