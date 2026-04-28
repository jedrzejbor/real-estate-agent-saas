'use client';

import Link from 'next/link';
import {
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Calendar,
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
    createdAt,
  } = listing;

  return (
    <Link
      href={`/dashboard/listings/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:shadow-md hover:border-primary/20"
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
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {/* Title */}
        <h3 className="font-heading text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
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
                {rooms} {rooms === 1 ? 'pokój' : rooms < 5 ? 'pokoje' : 'pokoi'}
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

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3">
        <p className="font-heading text-lg font-bold text-primary">
          {formatPrice(price, currency)}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleDateString('pl-PL')}
          </time>
        </div>
      </div>
    </Link>
  );
}
