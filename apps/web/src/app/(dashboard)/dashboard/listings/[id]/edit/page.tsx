'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  ImageIcon,
  RadioTower,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ListingForm } from '@/components/listings/listing-form';
import { ListingImageManager } from '@/components/listings/listing-image-manager';
import { ListingPublicationPanel } from '@/components/listings/listing-publication-panel';
import {
  fetchListing,
  LISTING_PUBLICATION_STATUS_LABELS,
  type Listing,
} from '@/lib/listings';

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tabFromUrl = parseEditListingTabId(tabParam);
  const [listing, setListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<EditListingTabId>('details');
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

  const tabs = getEditListingTabs(listing);
  const selectedTab =
    tabs.find((tab) => tab.id === (tabFromUrl ?? activeTab)) ?? tabs[0]!;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/20 p-2">
          <div
            className="grid gap-2 md:grid-cols-3"
            role="tablist"
            aria-label="Edycja oferty"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab.id === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-20 rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-primary bg-card text-foreground shadow-sm'
                      : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </div>
                    {tab.badge ? (
                      <Badge variant="outline" className="rounded-full">
                        {tab.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5">{tab.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Edytowany obszar
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
                {selectedTab.label}
              </h2>
            </div>
            {selectedTab.badge ? (
              <Badge variant="secondary" className="w-fit rounded-full">
                {selectedTab.badge}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="min-h-[560px] bg-background p-5">
          {selectedTab.id === 'details' ? (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <ListingForm listing={listing} />
            </div>
          ) : null}

          {selectedTab.id === 'images' ? (
            <ListingImageManager
              listing={listing}
              onListingChange={setListing}
            />
          ) : null}

          {selectedTab.id === 'publication' ? (
            <ListingPublicationPanel
              listing={listing}
              onListingChange={setListing}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

type EditListingTabId = 'details' | 'images' | 'publication';

interface EditListingTab {
  id: EditListingTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

function getEditListingTabs(listing: Listing): EditListingTab[] {
  return [
    {
      id: 'details',
      label: 'Dane oferty',
      description: 'Parametry, adres, cena, opis i prowizja.',
      icon: ClipboardList,
    },
    {
      id: 'images',
      label: 'Zdjęcia',
      description: 'Galeria, kolejność, zdjęcie główne i opisy.',
      icon: ImageIcon,
      badge: String(listing.images?.length ?? 0),
    },
    {
      id: 'publication',
      label: 'Publikacja',
      description: 'Widoczność publiczna, SEO i udostępnianie.',
      icon: RadioTower,
      badge: LISTING_PUBLICATION_STATUS_LABELS[listing.publicationStatus],
    },
  ];
}

function parseEditListingTabId(value: string | null): EditListingTabId | null {
  return value === 'details' || value === 'images' || value === 'publication'
    ? value
    : null;
}
