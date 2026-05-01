'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ListingForm } from '@/components/listings/listing-form';
import { ListingImageManager } from '@/components/listings/listing-image-manager';
import { ListingPublicationPanel } from '@/components/listings/listing-publication-panel';
import { fetchListing, type Listing } from '@/lib/listings';

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchListing(params.id)
      .then(setListing)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Nie znaleziono oferty'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Nie znaleziono oferty'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/listings/${listing.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do oferty
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">
          Edytuj ofertę
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{listing.title}</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <ListingForm listing={listing} />
      </div>

      <ListingImageManager listing={listing} onListingChange={setListing} />

      <ListingPublicationPanel listing={listing} onListingChange={setListing} />
    </div>
  );
}
