import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, ExternalLink, Home, MapPin } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import {
  fetchPublicListing,
  formatArea,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  type PublicListing,
} from '@/lib/listings';
import { PublicLeadSource } from '@/lib/public-leads';
import { PublicListingContactForm } from '@/components/listings/public-listing-contact-form';

interface PublicListingLeadFormPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PublicListingLeadFormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    return {
      title: 'Formularz nie znaleziony | EstateFlow',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `Kontakt w sprawie oferty: ${listing.title}`,
    description: 'Publiczny formularz kontaktowy EstateFlow.',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function PublicListingLeadFormPage({
  params,
}: PublicListingLeadFormPageProps) {
  const { slug } = await params;
  const listing = await getPublicListing(slug);

  if (!listing) {
    notFound();
  }

  const locationLabel = getLocationLabel(listing);
  const agentName =
    [listing.agent?.firstName, listing.agent?.lastName]
      .filter(Boolean)
      .join(' ') || 'Opiekun oferty';

  return (
    <main className="min-h-screen bg-[#FAFAF9] px-4 py-5 text-[#1C1917]">
      <section className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Formularz kontaktowy
              </p>
              <h1 className="mt-2 font-heading text-xl font-semibold leading-tight">
                {listing.title}
              </h1>
            </div>
            <Link
              href={`/oferty/${listing.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Otwórz ofertę"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {locationLabel ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {locationLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              {PROPERTY_TYPE_LABELS[listing.propertyType]} ·{' '}
              {formatArea(listing.areaM2 ?? listing.plotAreaM2 ?? undefined)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {agentName}
            </span>
          </div>

          <p className="mt-4 font-heading text-2xl font-semibold">
            {listing.price
              ? formatPrice(listing.price, listing.currency)
              : 'Cena na zapytanie'}
          </p>
        </div>

        <div className="pt-5">
          <PublicListingContactForm
            slug={listing.slug}
            listingId={listing.id}
            listingTitle={listing.title}
            source={PublicLeadSource.EMBED}
            trackingSource="public_listing_embedded_form"
            compact
          />
        </div>
      </section>

      {listing.estateflowBrandingEnabled ? (
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
          Powered by EstateFlow
        </p>
      ) : null}
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

function getLocationLabel(listing: PublicListing): string {
  const address = listing.address;
  if (!address) return '';

  return [address.district, address.city, address.voivodeship]
    .filter(Boolean)
    .join(', ');
}
