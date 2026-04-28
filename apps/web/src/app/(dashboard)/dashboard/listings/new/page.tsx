'use client';

import { ListingForm } from '@/components/listings/listing-form';

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Nowa oferta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wypełnij formularz, aby dodać nową ofertę nieruchomości.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <ListingForm />
      </div>
    </div>
  );
}
