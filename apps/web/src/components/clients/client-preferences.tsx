'use client';

import { Home, Maximize, Wallet, MapPin, BedDouble } from 'lucide-react';
import {
  type ClientPreference,
  PROPERTY_TYPE_LABELS,
  formatBudget,
} from '@/lib/clients';

interface ClientPreferencesCardProps {
  preference?: ClientPreference | null;
}

/** Card displaying client property preferences. */
export function ClientPreferencesCard({
  preference,
}: ClientPreferencesCardProps) {
  if (!preference) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Preferencje
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Brak zdefiniowanych preferencji. Edytuj profil klienta, aby je dodać.
        </p>
      </div>
    );
  }

  const items: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (preference.propertyType) {
    items.push({
      icon: <Home className="h-4 w-4" />,
      label: 'Typ nieruchomości',
      value: PROPERTY_TYPE_LABELS[preference.propertyType] ?? preference.propertyType,
    });
  }

  if (preference.minArea) {
    const area = typeof preference.minArea === 'string'
      ? parseFloat(preference.minArea)
      : preference.minArea;
    items.push({
      icon: <Maximize className="h-4 w-4" />,
      label: 'Min. powierzchnia',
      value: `${area} m²`,
    });
  }

  if (preference.maxPrice) {
    items.push({
      icon: <Wallet className="h-4 w-4" />,
      label: 'Maks. cena',
      value: formatBudget(preference.maxPrice),
    });
  }

  if (preference.preferredCity) {
    items.push({
      icon: <MapPin className="h-4 w-4" />,
      label: 'Preferowane miasto',
      value: preference.preferredCity,
    });
  }

  if (preference.minRooms) {
    items.push({
      icon: <BedDouble className="h-4 w-4" />,
      label: 'Min. pokoje',
      value: String(preference.minRooms),
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Preferencje
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Preferencje nie zostały jeszcze wypełnione.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="font-heading text-base font-semibold text-foreground">
        Preferencje
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium text-foreground">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
