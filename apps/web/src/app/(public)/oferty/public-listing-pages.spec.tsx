import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicListingsIndexPage from './page';
import PublicListingPage from './[slug]/page';
import {
  ListingPublicationStatus,
  PropertyType,
  PublicListingCatalogSort,
  TransactionType,
  type PublicListing,
  type PublicListingCatalogResponse,
} from '@/lib/listings';

const fetchPublicListingCatalogMock = jest.fn();
const fetchPublicListingMock = jest.fn();

jest.mock('next/link', () => {
  return function Link({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/lib/listings', () => {
  const actual = jest.requireActual('@/lib/listings');

  return {
    ...actual,
    fetchPublicListingCatalog: (...args: unknown[]) =>
      fetchPublicListingCatalogMock(...args),
    fetchPublicListing: (...args: unknown[]) => fetchPublicListingMock(...args),
  };
});

jest.mock('@/components/listings/public-listing-catalog', () => ({
  PublicListingCatalog({
    initialCatalog,
  }: {
    initialCatalog: PublicListingCatalogResponse | null;
  }) {
    return (
      <section data-testid="public-listing-catalog">
        {(initialCatalog?.data ?? []).map((listing) => (
          <article key={listing.id}>
            <h2>{listing.title}</h2>
            <p>{listing.address?.city}</p>
            <p>{listing.price}</p>
          </article>
        ))}
      </section>
    );
  },
}));

jest.mock('@/components/listings/public-listings-hero-actions', () => ({
  PublicListingsHeroActions() {
    return <div />;
  },
}));

jest.mock('@/components/listings/public-listing-analytics', () => ({
  PublicListingAnalytics() {
    return null;
  },
}));

jest.mock('@/components/listings/public-listing-abuse-report', () => ({
  PublicListingAbuseReport() {
    return null;
  },
}));

jest.mock('@/components/listings/public-listing-contact-form', () => ({
  PublicListingContactForm() {
    return <form id="kontakt" />;
  },
}));

jest.mock('@/components/listings/public-listing-favorite-action', () => ({
  PublicListingFavoriteAction() {
    return null;
  },
}));

jest.mock('@/components/listings/public-listing-gallery', () => ({
  PublicListingGallery({
    images,
  }: {
    images: Array<{ url: string; altText?: string | null }>;
  }) {
    return (
      <div data-testid="gallery">
        {images.map((image) => (
          <span key={image.url}>{image.altText ?? image.url}</span>
        ))}
      </div>
    );
  },
}));

describe('public listing pages rendering regression', () => {
  beforeEach(() => {
    fetchPublicListingCatalogMock.mockReset();
    fetchPublicListingMock.mockReset();
  });

  it('renders listings returned by the public catalog endpoint', async () => {
    fetchPublicListingCatalogMock.mockResolvedValue(buildCatalogResponse());

    const html = renderToStaticMarkup(
      await PublicListingsIndexPage({
        searchParams: Promise.resolve({ city: 'Warszawa' }),
      }),
    );

    expect(fetchPublicListingCatalogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Warszawa',
        sort: PublicListingCatalogSort.NEWEST,
        page: 1,
        limit: 24,
      }),
    );
    expect(html).toContain('2 ofert');
    expect(html).toContain('Rodzinny dom po moderacji');
    expect(html).toContain('Kameralne mieszkanie po moderacji');
  });

  it('renders the public detail page for a created listing slug', async () => {
    fetchPublicListingMock.mockResolvedValue(buildPublicListing());

    const html = renderToStaticMarkup(
      await PublicListingPage({
        params: Promise.resolve({ slug: 'rodzinny-dom-po-moderacji' }),
      }),
    );

    expect(fetchPublicListingMock).toHaveBeenCalledWith(
      'rodzinny-dom-po-moderacji',
    );
    expect(html).toContain('Rodzinny dom po moderacji');
    expect(html).toContain('Dom');
    expect(html).toContain('Sprzedaż');
    expect(html).toContain('Warszawa');
    expect(html).toContain('Kompletny opis publicznej oferty.');
  });
});

function buildCatalogResponse(): PublicListingCatalogResponse {
  return {
    data: [
      {
        id: 'listing-1',
        slug: 'rodzinny-dom-po-moderacji',
        title: 'Rodzinny dom po moderacji',
        propertyType: PropertyType.HOUSE,
        transactionType: TransactionType.SALE,
        price: 900000,
        currency: 'PLN',
        areaM2: 140,
        plotAreaM2: 850,
        rooms: 5,
        address: {
          city: 'Warszawa',
          district: 'Mokotow',
        },
        primaryImage: {
          id: 'image-1',
          url: '/uploads/listings/house-1.jpg',
        },
        images: [],
        imageCount: 3,
        agent: null,
        mapPoint: null,
        publishedAt: '2026-08-20T10:00:00.000Z',
        updatedAt: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'listing-2',
        slug: 'kameralne-mieszkanie-po-moderacji',
        title: 'Kameralne mieszkanie po moderacji',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.RENT,
        price: 3500,
        currency: 'PLN',
        areaM2: 55,
        rooms: 2,
        address: {
          city: 'Warszawa',
          district: 'Wola',
        },
        primaryImage: null,
        images: [],
        imageCount: 3,
        agent: null,
        mapPoint: null,
        publishedAt: '2026-08-20T11:00:00.000Z',
        updatedAt: '2026-08-20T11:00:00.000Z',
      },
    ],
    mapMarkers: [],
    meta: {
      page: 1,
      limit: 24,
      total: 2,
      totalPages: 1,
      sort: PublicListingCatalogSort.NEWEST,
      map: {
        limit: 100,
        pointsTotal: 0,
        pointsReturned: 0,
        truncated: false,
      },
    },
  };
}

function buildPublicListing(): PublicListing {
  return {
    id: 'listing-1',
    slug: 'rodzinny-dom-po-moderacji',
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    title: 'Rodzinny dom po moderacji',
    description: 'Kompletny opis publicznej oferty.',
    propertyType: PropertyType.HOUSE,
    transactionType: TransactionType.SALE,
    price: 900000,
    currency: 'PLN',
    areaM2: 140,
    plotAreaM2: 850,
    rooms: 5,
    bathrooms: 2,
    floor: null,
    totalFloors: 2,
    yearBuilt: 2020,
    address: {
      id: 'address-1',
      street: 'Prosta 1',
      city: 'Warszawa',
      district: 'Mokotow',
      voivodeship: 'mazowieckie',
    },
    images: [
      {
        id: 'image-1',
        url: '/uploads/listings/house-1.jpg',
        order: 0,
        isPrimary: true,
        altText: 'Dom glowny',
      },
      {
        id: 'image-2',
        url: '/uploads/listings/house-2.jpg',
        order: 1,
        isPrimary: false,
        altText: 'Dom salon',
      },
    ],
    agent: null,
    seoTitle: null,
    seoDescription: null,
    shareImageUrl: null,
    platformBrandingEnabled: true,
    estateflowBrandingEnabled: true,
    showPublicViewCount: true,
    publicViewCount: 12,
    publishedAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  };
}
