'use client';

import { ListingForm } from '@/components/listings/listing-form';

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Dodaj ofertę
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uzupełnij dane oferty, zdjęcia i ustawienia widoczności przed
          zapisaniem.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <ListingForm />
      </div>
    </div>
  );
}
