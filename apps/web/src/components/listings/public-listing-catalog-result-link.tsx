'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import {
  AnalyticsEventName,
  trackPublicListingEvent,
  type AnalyticsProperties,
} from '@/lib/analytics';

interface PublicListingCatalogResultLinkProps extends Omit<
  ComponentProps<typeof Link>,
  'href' | 'onClick'
> {
  slug: string;
  listingId: string;
  position: number;
  searchProperties?: AnalyticsProperties;
  children: ReactNode;
}

export function PublicListingCatalogResultLink({
  slug,
  listingId,
  position,
  searchProperties,
  children,
  ...props
}: PublicListingCatalogResultLinkProps) {
  return (
    <Link
      href={`/oferty/${slug}`}
      onClick={() => {
        trackPublicListingEvent({
          slug,
          name: AnalyticsEventName.PUBLIC_LISTING_CATALOG_RESULT_CLICKED,
          properties: {
            listingId,
            position,
            ...searchProperties,
          },
        });
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
