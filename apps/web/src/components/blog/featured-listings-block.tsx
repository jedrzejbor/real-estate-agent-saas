/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowRight, ImageIcon, MapPin, Maximize } from 'lucide-react';
import {
  fetchPublicListingCatalog,
  formatArea,
  formatPrice,
  PublicListingCatalogSort,
  TRANSACTION_TYPE_LABELS,
  type PublicListingCatalogItem,
} from '@/lib/listings';

const FALLBACK_LIMIT = 3;

export async function FeaturedListingsBlock() {
  const listings = await getFeaturedListings();

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold leading-tight text-[#1C1917]">
            Wyróżnione oferty
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sprawdź aktualne nieruchomości opublikowane w katalogu EstateFlow.
          </p>
        </div>
        <Link
          href="/oferty"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Katalog ofert
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {listings.map((listing) => (
          <FeaturedListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

async function getFeaturedListings() {
  try {
    const response = await fetchPublicListingCatalog({
      limit: FALLBACK_LIMIT,
      page: 1,
      sort: PublicListingCatalogSort.NEWEST,
    });

    return response.data.slice(0, FALLBACK_LIMIT);
  } catch {
    return [];
  }
}

function FeaturedListingCard({
  listing,
}: {
  listing: PublicListingCatalogItem;
}) {
  const image = listing.primaryImage;
  const location = [listing.address?.district, listing.address?.city]
    .filter(Boolean)
    .join(', ');

  return (
    <Link
      href={`/oferty/${listing.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-primary/40"
    >
      <div className="aspect-[4/3] bg-muted">
        {image?.url ? (
          <img
            src={image.url}
            alt={image.altText || listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-primary">
          {TRANSACTION_TYPE_LABELS[listing.transactionType]}
        </p>
        <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold leading-snug text-[#1C1917] transition-colors group-hover:text-primary">
          {listing.title}
        </h3>

        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {location ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
          {listing.areaM2 || listing.plotAreaM2 ? (
            <p className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4 shrink-0" />
              {formatArea(listing.areaM2 ?? listing.plotAreaM2 ?? undefined)}
            </p>
          ) : null}
        </div>

        {listing.price ? (
          <p className="mt-4 font-heading text-lg font-bold text-primary">
            {formatPrice(listing.price, listing.currency)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
