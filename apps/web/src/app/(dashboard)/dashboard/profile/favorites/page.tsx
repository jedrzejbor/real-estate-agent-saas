import type { Metadata } from 'next';
import { FavoriteListingsList } from '@/components/listings';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Ulubione oferty | ${APP_NAME}`,
};

export default function FavoriteListingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Profil użytkownika
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Ulubione oferty
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Zapisane nieruchomości z wyszukiwarki ofert. Możesz wrócić do
          aktywnych ogłoszeń albo usunąć oferty, które nie są już aktualne.
        </p>
      </header>

      <FavoriteListingsList />
    </div>
  );
}
