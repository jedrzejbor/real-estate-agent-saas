import {
  ListingPublicationStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';

export interface PublicListingAddress {
  city: string;
  district?: string | null;
  voivodeship?: string | null;
  street?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PublicListingImage {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
  altText?: string | null;
}

export interface PublicListingAgent {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface PublicListingView {
  id: string;
  slug: string;
  publicationStatus: ListingPublicationStatus.PUBLISHED;
  title: string;
  description?: string | null;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  address?: PublicListingAddress | null;
  images: PublicListingImage[];
  agent?: PublicListingAgent | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  shareImageUrl?: string | null;
  estateflowBrandingEnabled: boolean;
  publishedAt: Date;
  updatedAt: Date;
}

export interface ListingPublicDefaults {
  title: string;
  description?: string | null;
  seoTitle: string;
  seoDescription?: string | null;
}
