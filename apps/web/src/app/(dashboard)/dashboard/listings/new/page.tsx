'use client';

import * as React from 'react';
import {
  ListingForm,
  ListingIntentSelector,
} from '@/components/listings';
import { Button } from '@/components/ui/button';
import { TRANSACTION_TYPE_LABELS } from '@/lib/listings';
import { getListingIntentOption } from '@/lib/listing-intent-options';
import type { ListingIntentSelection } from '@/lib/listing-intent-options';

export default function NewListingPage() {
  const [intent, setIntent] = React.useState<ListingIntentSelection | null>(
    null,
  );
  const selectedIntent = intent ? getListingIntentOption(intent) : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Dodaj ofertę
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zacznij od najważniejszych danych. Szczegóły, mapę i ustawienia
          publikacji możesz uzupełnić od razu albo po zapisaniu.
        </p>
      </div>

      {intent ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedIntent
                  ? `${TRANSACTION_TYPE_LABELS[selectedIntent.transactionType]}: ${selectedIntent.label}`
                  : 'Wybrano typ oferty'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Możesz zmienić wybór przed zapisaniem ogłoszenia.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIntent(null)}
              className="h-9 rounded-xl"
            >
              Zmień typ
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <ListingForm
              key={selectedIntent?.id}
              variant="guided"
              initialPropertyType={intent.propertyType}
              initialTransactionType={intent.transactionType}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ListingIntentSelector value={intent} onChange={setIntent} />
        </div>
      )}
    </div>
  );
}
