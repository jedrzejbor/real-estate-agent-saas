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
  Home,
  Layers3,
  Mail,
  MapPin,
  Maximize,
  Phone,
  Ruler,
} from 'lucide-react';
import {
  fetchPublicListing,
  formatArea,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PublicListing,
} from '@/lib/listings';
import { ApiError } from '@/lib/api-client';

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
      title: 'Oferta nie znaleziona | EstateFlow',
    };
  }

  const title = listing.seoTitle || listing.title;
  const description =
    listing.seoDescription ||
    listing.description ||
    `${PROPERTY_TYPE_LABELS[listing.propertyType]} ${getLocationLabel(listing)} w EstateFlow.`;
  const image = listing.shareImageUrl || getPrimaryImageUrl(listing);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
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

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
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
              EstateFlow
            </Link>
            {listing.estateflowBrandingEnabled ? (
              <div className="rounded-full bg-white/12 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                Powered by EstateFlow
              </div>
            ) : null}
          </div>

          <div className="max-w-4xl pb-6">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-900">
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
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100"
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
            <Fact
              icon={Maximize}
              label="Powierzchnia"
              value={formatArea(
                listing.areaM2 ?? listing.plotAreaM2 ?? undefined,
              )}
            />
            <Fact
              icon={BedDouble}
              label="Pokoje"
              value={formatNullableNumber(listing.rooms)}
            />
            <Fact
              icon={Bath}
              label="Łazienki"
              value={formatNullableNumber(listing.bathrooms)}
            />
            <Fact
              icon={CalendarDays}
              label="Rok budowy"
              value={formatNullableNumber(listing.yearBuilt)}
            />
          </div>

          {listing.description ? (
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-heading text-2xl font-semibold">
                Opis nieruchomości
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground sm:text-base">
                {listing.description}
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-2xl font-semibold">Szczegóły</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail
                icon={Home}
                label="Typ nieruchomości"
                value={PROPERTY_TYPE_LABELS[listing.propertyType]}
              />
              <Detail
                icon={Building2}
                label="Typ transakcji"
                value={TRANSACTION_TYPE_LABELS[listing.transactionType]}
              />
              <Detail
                icon={Ruler}
                label="Powierzchnia działki"
                value={formatArea(listing.plotAreaM2 ?? undefined)}
              />
              <Detail
                icon={Layers3}
                label="Piętro"
                value={formatFloor(listing)}
              />
            </div>
          </section>

          {galleryImages.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-heading text-2xl font-semibold">Galeria</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {galleryImages.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.altText || listing.title}
                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="kontakt" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Opiekun oferty
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">
              {agentName || 'Agent nieruchomości'}
            </h2>
            <div className="mt-5 space-y-3">
              {listing.agent?.phone ? (
                <a
                  href={`tel:${listing.agent.phone}`}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" />
                  Zadzwoń
                </a>
              ) : null}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Pytanie o ofertę: ${listing.title}`)}`}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Mail className="h-4 w-4" />
                Wyślij zapytanie
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Formularz leadowy zostanie dodany w kolejnym sprincie. Na tym
              etapie publiczna strona pełni rolę gotowej karty oferty do
              udostępniania.
            </p>
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
  const primaryImage = getPrimaryImageUrl(listing);
  return listing.images
    .filter((image) => image.url !== primaryImage)
    .slice(0, 6);
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
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-border">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
