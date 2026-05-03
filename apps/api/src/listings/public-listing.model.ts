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
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  agency?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
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

export interface PublicListingSitemapEntry {
  slug: string;
  updatedAt: Date;
}

export interface PublicListingCatalogAddress {
  city: string;
  district?: string | null;
  voivodeship?: string | null;
}

export interface PublicListingCatalogAgent {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  agency?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
}

export interface PublicListingCatalogItem {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  address?: PublicListingCatalogAddress | null;
  primaryImage?: {
    id: string;
    url: string;
    altText?: string | null;
  } | null;
  imageCount: number;
  agent?: PublicListingCatalogAgent | null;
  publishedAt: Date;
  updatedAt: Date;
}

export interface PublicListingCatalogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sort: string;
}

export interface PublicListingCatalogResponse {
  data: PublicListingCatalogItem[];
  meta: PublicListingCatalogMeta;
}

export interface PublicAgentProfileListing {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  address?: PublicListingAddress | null;
  imageUrl?: string | null;
  publishedAt: Date;
}

export interface PublicAgentProfileView {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  agency?: {
    id: string;
    name: string;
    address?: string | null;
    logoUrl?: string | null;
  } | null;
  listings: PublicAgentProfileListing[];
  updatedAt: Date;
}

export interface ListingPublicDefaults {
  title: string;
  description?: string | null;
  seoTitle: string;
  seoDescription?: string | null;
}
