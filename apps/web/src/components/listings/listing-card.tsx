'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Calendar,
  Eye,
  ImageIcon,
} from 'lucide-react';
import { ListingStatusBadge } from './listing-status-badge';
import {
  type Listing,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatPrice,
  formatArea,
} from '@/lib/listings';

interface ListingCardProps {
  listing: Listing;
}

/** Card component displaying a listing summary in list/grid views. */
export function ListingCard({ listing }: ListingCardProps) {
  const {
    id,
    title,
    propertyType,
    status,
    transactionType,
    price,
    currency,
    areaM2,
    plotAreaM2,
    rooms,
    bathrooms,
    address,
    images,
    shareImageUrl,
    publicViewCount,
    createdAt,
  } = listing;
  const primaryImage = getPrimaryListingImage(images, shareImageUrl);

  return (
    <Link
      href={`/dashboard/listings/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20"
    >
      {/* Header with type badge & status */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {PROPERTY_TYPE_LABELS[propertyType]}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">
            {TRANSACTION_TYPE_LABELS[transactionType]}
          </span>
        </div>
        <ListingStatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-4 px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Title */}
          <h3 className="line-clamp-2 font-heading text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>

          {/* Location */}
          {address?.city && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {[address.district, address.city].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {areaM2 && (
              <div className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" />
                <span>{formatArea(areaM2)}</span>
              </div>
            )}
            {!areaM2 && plotAreaM2 && (
              <div className="flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" />
                <span>{formatArea(plotAreaM2)}</span>
              </div>
            )}
            {rooms && (
              <div className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                <span>
                  {rooms}{' '}
                  {rooms === 1 ? 'pokój' : rooms < 5 ? 'pokoje' : 'pokoi'}
                </span>
              </div>
            )}
            {bathrooms !== undefined && bathrooms !== null && (
              <div className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                <span>{bathrooms}</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-28 w-32 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-36">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText || title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-7 w-7" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3">
        <p className="font-heading text-lg font-bold text-primary">
          {formatPrice(price, currency)}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>{publicViewCount ?? 0}</span>
          <span className="text-muted-foreground/40">·</span>
          <Calendar className="h-3 w-3" />
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleDateString('pl-PL')}
          </time>
        </div>
      </div>
    </Link>
  );
}

function getPrimaryListingImage(
  images: Listing['images'],
  shareImageUrl?: string | null,
): { url: string; altText?: string | null } | null {
  const orderedImages = (images ?? []).slice().sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1;
    }

    return a.order - b.order;
  });

  const primaryImage = orderedImages[0];

  if (primaryImage?.url) {
    return primaryImage;
  }

  return shareImageUrl ? { url: shareImageUrl, altText: null } : null;
}
