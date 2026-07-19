/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Eye,
  Home,
  Layers3,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Ruler,
  ShieldCheck,
} from 'lucide-react';
import { absoluteUrl, compactJsonLd, getSiteUrl } from '@/lib/seo';
import {
  fetchPublicListing,
  formatArea,
  formatPrice,
  isPlatformBrandingEnabled,
  PROPERTY_TYPE_LABELS,
  shouldShowListingField,
  TRANSACTION_TYPE_LABELS,
  type PublicListing,
} from '@/lib/listings';
import { ApiError } from '@/lib/api-client';
import { PublicListingAnalytics } from '@/components/listings/public-listing-analytics';
import { PublicListingAbuseReport } from '@/components/listings/public-listing-abuse-report';
import { PublicListingContactForm } from '@/components/listings/public-listing-contact-form';
import { PublicListingFavoriteAction } from '@/components/listings/public-listing-favorite-action';
import { PublicListingGallery } from '@/components/listings/public-listing-gallery';
import { APP_NAME } from '@/lib/brand';

interface PublicListingPageProps {
  params: Promise<{ slug: string }>;
}

const FALLBACK_HERO_IMAGE = '/images/hero/house-1.jpg';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PublicListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    return {
      title: `Oferta nie znaleziona | ${APP_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = listing.seoTitle || listing.title;
  const description =
    listing.seoDescription ||
    listing.description ||
    `${PROPERTY_TYPE_LABELS[listing.propertyType]} ${getLocationLabel(listing)} w ${APP_NAME}.`;
  const canonicalUrl = absoluteUrl(`/oferty/${listing.slug}`);
  const imageUrl = getSeoImageUrl(listing);

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: APP_NAME,
      type: 'article',
      locale: 'pl_PL',
      publishedTime: listing.publishedAt,
      modifiedTime: listing.updatedAt,
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicListingPage({
  params,
}: PublicListingPageProps) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    notFound();
  }

  const primaryImage = getPrimaryImageUrl(listing) ?? FALLBACK_HERO_IMAGE;
  const galleryImages = getGalleryImages(listing);
  const locationLabel = getLocationLabel(listing);
  const agentName = [listing.agent?.firstName, listing.agent?.lastName]
    .filter(Boolean)
    .join(' ');
  const canonicalUrl = absoluteUrl(`/oferty/${listing.slug}`);
  const jsonLd = buildListingJsonLd(listing, canonicalUrl, primaryImage);
  const facts = getPublicListingFacts(listing);
  const details = getPublicListingDetails(listing);
  const trustSignals = getPublicListingTrustSignals(listing);
  const showPlatformBranding = isPlatformBrandingEnabled(listing);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative min-h-[78vh] overflow-hidden bg-stone-950 text-white">
        <img
          src={primaryImage}
          alt={listing.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {APP_NAME}
            </Link>
            {showPlatformBranding ? (
              <div className="rounded-full bg-white/12 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                Powered by {APP_NAME}
              </div>
            ) : null}
          </div>

          <div className="max-w-4xl pb-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                {PROPERTY_TYPE_LABELS[listing.propertyType]}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                {TRANSACTION_TYPE_LABELS[listing.transactionType]}
              </span>
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {listing.title}
            </h1>
            {locationLabel ? (
              <p className="mt-4 flex max-w-2xl items-center gap-2 text-base text-white/85 sm:text-lg">
                <MapPin className="h-5 w-5 shrink-0" />
                {locationLabel}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-white/60">
                  Cena
                </p>
                <p className="mt-1 font-heading text-3xl font-bold sm:text-4xl">
                  {listing.price
                    ? formatPrice(listing.price, listing.currency)
                    : 'Cena na zapytanie'}
                </p>
              </div>
              <a
                href="#kontakt"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-stone-100"
              >
                Skontaktuj się
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <Fact key={fact.label} {...fact} />
            ))}
            {listing.showPublicViewCount ? (
              <Fact
                icon={Eye}
                label="Wyświetlenia"
                value={String(listing.publicViewCount ?? 0)}
              />
            ) : null}
          </div>

          {listing.description ? (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-heading text-2xl font-semibold">
                Opis nieruchomości
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
                {listing.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-semibold">Szczegóły</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <Detail key={detail.label} {...detail} />
              ))}
            </div>
          </section>

          {galleryImages.length > 0 ? (
            <PublicListingGallery
              slug={listing.slug}
              listingId={listing.id}
              listingTitle={listing.title}
              images={galleryImages}
            />
          ) : null}
        </div>

        <aside id="kontakt" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Opiekun oferty
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">
              {agentName || 'Agent nieruchomości'}
            </h2>
            {listing.agent?.agency?.name ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {listing.agent.agency.name}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2 rounded-2xl border border-border bg-muted/30 p-3">
              {trustSignals.map((signal) => (
                <TrustSignal key={signal.label} {...signal} />
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <PublicListingFavoriteAction
                listingId={listing.id}
                listingSlug={listing.slug}
              />
              {listing.agent?.id ? (
                <Link
                  href={`/agenci/${listing.agent.id}`}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  Profil i oferty
                </Link>
              ) : null}
              {listing.agent?.phone ? (
                <a
                  href={`tel:${listing.agent.phone}`}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" />
                  Zadzwoń
                </a>
              ) : null}
              <PublicListingContactForm
                slug={listing.slug}
                listingId={listing.id}
                listingTitle={listing.title}
              />
              <PublicListingAnalytics
                slug={listing.slug}
                listingId={listing.id}
                title={listing.title}
                url={canonicalUrl}
              />
              <PublicListingAbuseReport
                slug={listing.slug}
                listingId={listing.id}
                listingTitle={listing.title}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

async function getPublicListing(slug: string): Promise<PublicListing | null> {
  try {
    return await fetchPublicListing(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

function getPrimaryImageUrl(listing: PublicListing): string | null {
  return (
    listing.images.find((image) => image.isPrimary)?.url ??
    listing.images[0]?.url ??
    null
  );
}

function getGalleryImages(listing: PublicListing) {
  return listing.images.slice().sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.order - b.order;
  });
}

function getSeoImageUrl(listing: PublicListing): string {
  const candidateImages = [
    listing.shareImageUrl,
    getPrimaryImageUrl(listing),
    FALLBACK_HERO_IMAGE,
  ];

  return absoluteUrl(
    candidateImages.find((image) => isCrawlableImageUrl(image)) ??
      FALLBACK_HERO_IMAGE,
  );
}

function isCrawlableImageUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false;

  return (
    value.startsWith('/') ||
    value.startsWith('https://') ||
    value.startsWith('http://')
  );
}

function getLocationLabel(listing: PublicListing): string {
  const address = listing.address;
  if (!address) return '';

  return [address.street, address.district, address.city, address.voivodeship]
    .filter(Boolean)
    .join(', ');
}

function formatNullableNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

function formatFloor(listing: PublicListing): string {
  if (listing.floor === null || listing.floor === undefined) {
    return '—';
  }

  return listing.totalFloors
    ? `${listing.floor} / ${listing.totalFloors}`
    : String(listing.floor);
}

function getPublicListingFacts(listing: PublicListing): DisplayItem[] {
  const facts: DisplayItem[] = [];

  if (
    shouldShowListingField(listing.propertyType, 'areaM2') &&
    hasListingValue(listing.areaM2)
  ) {
    facts.push({
      icon: Maximize,
      label:
        listing.propertyType === 'house'
          ? 'Powierzchnia domu'
          : 'Powierzchnia',
      value: formatArea(listing.areaM2 ?? undefined),
    });
  }

  if (
    shouldShowListingField(listing.propertyType, 'plotAreaM2') &&
    hasListingValue(listing.plotAreaM2)
  ) {
    facts.push({
      icon: Ruler,
      label: 'Powierzchnia działki',
      value: formatArea(listing.plotAreaM2 ?? undefined),
    });
  }

  if (
    shouldShowListingField(listing.propertyType, 'rooms') &&
    hasListingValue(listing.rooms)
  ) {
    facts.push({
      icon: BedDouble,
      label: listing.propertyType === 'office' ? 'Pokoje / gabinety' : 'Pokoje',
      value: formatNullableNumber(listing.rooms),
    });
  }

  if (
    shouldShowListingField(listing.propertyType, 'bathrooms') &&
    hasListingValue(listing.bathrooms)
  ) {
    facts.push({
      icon: Bath,
      label: listing.propertyType === 'commercial' ? 'Sanitariaty' : 'Łazienki',
      value: formatNullableNumber(listing.bathrooms),
    });
  }

  if (
    shouldShowListingField(listing.propertyType, 'yearBuilt') &&
    hasListingValue(listing.yearBuilt)
  ) {
    facts.push({
      icon: CalendarDays,
      label: 'Rok budowy',
      value: formatNullableNumber(listing.yearBuilt),
    });
  }

  return facts;
}

function getPublicListingDetails(listing: PublicListing): DisplayItem[] {
  const details: DisplayItem[] = [
    {
      icon: Home,
      label: 'Typ nieruchomości',
      value: PROPERTY_TYPE_LABELS[listing.propertyType],
    },
    {
      icon: Building2,
      label: 'Typ transakcji',
      value: TRANSACTION_TYPE_LABELS[listing.transactionType],
    },
  ];

  if (
    shouldShowListingField(listing.propertyType, 'floor') &&
    hasListingValue(listing.floor)
  ) {
    details.push({
      icon: Layers3,
      label: 'Piętro',
      value: formatFloor(listing),
    });
  }

  if (
    shouldShowListingField(listing.propertyType, 'totalFloors') &&
    hasListingValue(listing.totalFloors)
  ) {
    details.push({
      icon: Building2,
      label: 'Liczba pięter',
      value: formatNullableNumber(listing.totalFloors),
    });
  }

  return details;
}

function getPublicListingTrustSignals(listing: PublicListing): DisplayItem[] {
  const hasPhone = Boolean(listing.agent?.phone);
  const hasStreet = Boolean(listing.address?.street);

  return [
    {
      icon: MessageCircle,
      label: 'Typ kontaktu',
      value: hasPhone ? 'Telefon i formularz' : 'Formularz kontaktowy',
    },
    {
      icon: MapPin,
      label: 'Lokalizacja',
      value: hasStreet ? 'Dokładna' : 'Przybliżona',
    },
    {
      icon: CalendarDays,
      label: 'Ostatnia aktualizacja',
      value: formatDisplayDate(listing.updatedAt),
    },
    {
      icon: ShieldCheck,
      label: 'Status oferty',
      value: 'Publicznie zweryfikowana',
    },
  ];
}

function formatDisplayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Brak daty';

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function hasListingValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function buildListingJsonLd(
  listing: PublicListing,
  canonicalUrl: string,
  primaryImage: string,
) {
  const locationLabel = getLocationLabel(listing);
  const imageUrls = [
    listing.shareImageUrl,
    primaryImage,
    ...listing.images.map((image) => image.url),
  ]
    .filter(isCrawlableImageUrl)
    .map((image) => absoluteUrl(image));
  const uniqueImageUrls = Array.from(new Set(imageUrls));
  const agentName = [listing.agent?.firstName, listing.agent?.lastName]
    .filter(Boolean)
    .join(' ');

  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: listing.title,
    description: listing.description,
    datePosted: listing.publishedAt,
    dateModified: listing.updatedAt,
    image: uniqueImageUrls,
    offers: listing.price
      ? {
          '@type': 'Offer',
          price: String(listing.price),
          priceCurrency: listing.currency,
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
        }
      : undefined,
    itemOffered: {
      '@type': 'Residence',
      name: listing.title,
      floorSize: listing.areaM2
        ? {
            '@type': 'QuantitativeValue',
            value: Number(listing.areaM2),
            unitCode: 'MTK',
          }
        : undefined,
      numberOfRooms: listing.rooms,
      address: listing.address
        ? {
            '@type': 'PostalAddress',
            addressLocality: listing.address.city,
            addressRegion: listing.address.voivodeship,
            streetAddress: [listing.address.street, listing.address.district]
              .filter(Boolean)
              .join(', '),
            postalCode: listing.address.postalCode,
            addressCountry: 'PL',
          }
        : undefined,
    },
    provider: agentName
      ? {
          '@type': 'RealEstateAgent',
          name: agentName,
          telephone: listing.agent?.phone,
        }
      : undefined,
    areaServed: locationLabel,
  });
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Maximize;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary ring-1 ring-border">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function TrustSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

interface DisplayItem {
  icon: typeof Maximize;
  label: string;
  value: string;
}
