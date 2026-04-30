/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Phone,
  Ruler,
  UserRound,
} from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { absoluteUrl, compactJsonLd, getSiteUrl } from '@/lib/seo';
import {
  fetchPublicAgentProfile,
  formatArea,
  formatPrice,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type PublicAgentProfile,
  type PublicAgentProfileListing,
} from '@/lib/listings';
import { PublicProfileContactForm } from '@/components/public-profiles/public-profile-contact-form';

interface PublicAgentProfilePageProps {
  params: Promise<{ id: string }>;
}

const FALLBACK_LISTING_IMAGE = '/images/hero/house-2.jpg';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PublicAgentProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicAgentProfile(id);

  if (!profile) {
    return {
      title: 'Profil nie znaleziony | EstateFlow',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const profileName = getProfileName(profile);
  const title = `${profileName} - oferty nieruchomości`;
  const description =
    profile.bio ||
    `Sprawdź aktywne oferty i skontaktuj się z ${profileName} przez EstateFlow.`;
  const canonicalUrl = absoluteUrl(`/agenci/${profile.id}`);
  const imageUrl = absoluteUrl(
    profile.avatarUrl || profile.agency?.logoUrl || FALLBACK_LISTING_IMAGE,
  );

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'EstateFlow',
      type: 'profile',
      locale: 'pl_PL',
      images: [
        {
          url: imageUrl,
          alt: profileName,
        },
      ],
    },
  };
}

export default async function PublicAgentProfilePage({
  params,
}: PublicAgentProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicAgentProfile(id);

  if (!profile) {
    notFound();
  }

  const profileName = getProfileName(profile);
  const canonicalUrl = absoluteUrl(`/agenci/${profile.id}`);
  const jsonLd = buildProfileJsonLd(profile, canonicalUrl);

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              EstateFlow
            </Link>
            <span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Profil publiczny
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-primary ring-1 ring-border">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-12 w-12" />
                )}
              </div>
              <div>
                {profile.agency ? (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {profile.agency.name}
                  </p>
                ) : null}
                <h1 className="mt-2 font-heading text-4xl font-bold leading-tight sm:text-5xl">
                  {profileName}
                </h1>
                {profile.bio ? (
                  <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-7 text-muted-foreground">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Aktywne oferty
              </p>
              <p className="font-heading text-3xl font-semibold">
                {profile.listings.length}
              </p>
              {profile.phone ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" />
                  Zadzwoń
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <div>
          <h2 className="font-heading text-2xl font-semibold">
            Aktualne oferty
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {profile.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>

        <aside id="kontakt" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Kontakt</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">
              Napisz do profilu
            </h2>
            <div className="mt-5">
              <PublicProfileContactForm
                agentId={profile.id}
                profileName={profileName}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

async function getPublicAgentProfile(
  id: string,
): Promise<PublicAgentProfile | null> {
  try {
    return await fetchPublicAgentProfile(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

function ListingCard({ listing }: { listing: PublicAgentProfileListing }) {
  const locationLabel = getLocationLabel(listing);

  return (
    <Link
      href={`/oferty/${listing.slug}`}
      className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-colors hover:border-primary/40"
    >
      <img
        src={listing.imageUrl || FALLBACK_LISTING_IMAGE}
        alt={listing.title}
        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {PROPERTY_TYPE_LABELS[listing.propertyType]}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {TRANSACTION_TYPE_LABELS[listing.transactionType]}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 font-heading text-xl font-semibold leading-snug">
          {listing.title}
        </h3>
        {locationLabel ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {locationLabel}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-4 w-4" />
            {formatArea(listing.areaM2 ?? listing.plotAreaM2 ?? undefined)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Home className="h-4 w-4" />
            {listing.rooms ? `${listing.rooms} pok.` : 'Szczegóły'}
          </span>
        </div>
        <p className="mt-4 font-heading text-xl font-semibold">
          {listing.price
            ? formatPrice(listing.price, listing.currency)
            : 'Cena na zapytanie'}
        </p>
      </div>
    </Link>
  );
}

function getProfileName(profile: PublicAgentProfile): string {
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    profile.agency?.name ||
    'Agent nieruchomości'
  );
}

function getLocationLabel(listing: PublicAgentProfileListing): string {
  const address = listing.address;
  if (!address) return '';

  return [address.district, address.city, address.voivodeship]
    .filter(Boolean)
    .join(', ');
}

function buildProfileJsonLd(profile: PublicAgentProfile, canonicalUrl: string) {
  const profileName = getProfileName(profile);

  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': profile.agency ? 'RealEstateAgent' : 'Person',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: profileName,
    description: profile.bio,
    image: profile.avatarUrl ? absoluteUrl(profile.avatarUrl) : undefined,
    telephone: profile.phone,
    worksFor: profile.agency
      ? {
          '@type': 'RealEstateAgent',
          name: profile.agency.name,
          image: profile.agency.logoUrl
            ? absoluteUrl(profile.agency.logoUrl)
            : undefined,
          address: profile.agency.address,
        }
      : undefined,
    makesOffer: profile.listings.map((listing) => ({
      '@type': 'Offer',
      name: listing.title,
      url: absoluteUrl(`/oferty/${listing.slug}`),
      price: listing.price ? String(listing.price) : undefined,
      priceCurrency: listing.currency,
    })),
  });
}
