'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit3,
  Eye,
  EyeOff,
  Home,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import {
  AGENT_DASHBOARD_PATH,
  isPrivateSellerUser,
} from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  formatPrice,
  ListingPublicationStatus,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/listings';
import {
  fetchSellerPublicListingSubmission,
  renewSellerPublicListingSubmission,
  type SellerPublicListingSubmissionDetail,
  unpublishSellerPublicListingSubmission,
} from '@/lib/public-listing-submissions';
import { Logo } from '@/components/common/logo';

export default function SellerListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const [submission, setSubmission] =
    useState<SellerPublicListingSubmissionDetail | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isPrivateSeller) {
      router.replace(AGENT_DASHBOARD_PATH);
    }
  }, [isLoading, isPrivateSeller, router, user]);

  useEffect(() => {
    if (isLoading || !user || !isPrivateSeller) return;

    let cancelled = false;

    async function loadSubmission() {
      try {
        const result = await fetchSellerPublicListingSubmission(params.id);
        if (!cancelled) {
          setSubmission(result);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: 'Nie udało się pobrać ogłoszenia',
            description: getApiErrorMessage(error),
          });
          router.replace('/seller');
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void loadSubmission();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isPrivateSeller, params.id, router, showErrorToast, user]);

  async function renewListing() {
    if (!submission) return;

    setIsUpdating(true);

    try {
      const updated = await renewSellerPublicListingSubmission(submission.id);
      setSubmission(updated);
      showSuccessToast({
        title: 'Ogłoszenie odnowione',
        description: 'Zaktualizowaliśmy datę ważności ogłoszenia.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się odnowić ogłoszenia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function unpublishListing() {
    if (!submission) return;

    setIsUpdating(true);

    try {
      const updated = await unpublishSellerPublicListingSubmission(
        submission.id,
      );
      setSubmission(updated);
      showSuccessToast({
        title: 'Ogłoszenie wycofane',
        description: 'Oferta nie jest już widoczna w publicznym katalogu.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się wycofać ogłoszenia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading || isFetching || !user || !isPrivateSeller || !submission) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  const isPublished =
    submission.publicationStatus === ListingPublicationStatus.PUBLISHED;
  const isExpired = Boolean(
    submission.expiresAt && new Date(submission.expiresAt).getTime() <= Date.now(),
  );
  const publicHref =
    submission.publishedListingSlug && isPublished && !isExpired
      ? `/oferty/${submission.publishedListingSlug}`
      : null;
  const canRenew = Boolean(submission.publishedListingId);
  const canUnpublish = Boolean(submission.publishedListingId && isPublished);
  const primaryImage = submission.images[0]?.url ?? submission.primaryImageUrl;

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label="Panel właściciela EstateFlow">
            <Logo size="sm" />
          </Link>
          <Link
            href="/seller"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div
            className="min-h-72 bg-muted"
            style={
              primaryImage
                ? {
                    backgroundImage: `url(${primaryImage})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                  }
                : undefined
            }
          >
            {!primaryImage ? (
              <div className="flex min-h-72 items-center justify-center text-muted-foreground">
                <Home className="h-12 w-12" />
              </div>
            ) : null}
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {PROPERTY_TYPE_LABELS[submission.propertyType]}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {TRANSACTION_TYPE_LABELS[submission.transactionType]}
              </span>
            </div>

            <h1 className="mt-4 font-heading text-3xl font-bold">
              {submission.title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {submission.city ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {submission.city}
                </span>
              ) : null}
              <span>Dodano {formatDate(submission.createdAt)}</span>
              {submission.expiresAt ? (
                <span>
                  {isExpired ? 'Wygasło' : 'Ważne do'}{' '}
                  {formatDate(submission.expiresAt)}
                </span>
              ) : null}
            </div>

            <p className="mt-5 text-xl font-semibold">
              {submission.price
                ? formatPrice(submission.price, submission.currency)
                : 'Cena do ustalenia'}
            </p>

            {submission.listing.description ? (
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {String(submission.listing.description)}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Status</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {getStatusDescription(submission)}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <StatTile
                icon={<Eye className="h-4 w-4" />}
                label="Wyświetlenia"
                value={formatNumber(submission.viewCount ?? 0)}
              />
              <StatTile
                icon={<MessageSquareText className="h-4 w-4" />}
                label="Zapytania"
                value={formatNumber(submission.inquiryCount ?? 0)}
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold">Akcje</h2>
            <div className="mt-4 grid gap-2">
              <Link
                href={`/seller/listings/${submission.id}/edit`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Edit3 className="h-4 w-4" />
                Edytuj
              </Link>
              {publicHref ? (
                <Link
                  href={publicHref}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  <Eye className="h-4 w-4" />
                  Zobacz publicznie
                </Link>
              ) : null}
              {canRenew ? (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={renewListing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Odnów
                </button>
              ) : null}
              {canUnpublish ? (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={unpublishListing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  Wycofaj
                </button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function getStatusDescription(
  submission: SellerPublicListingSubmissionDetail,
): string {
  if (submission.publicationStatus === ListingPublicationStatus.PUBLISHED) {
    return 'Ogłoszenie jest opublikowane i widoczne w katalogu.';
  }

  if (submission.status === 'rejected') {
    return 'Ogłoszenie wymaga poprawek przed ponowną weryfikacją.';
  }

  if (submission.status === 'claimed') {
    return 'Ogłoszenie oczekuje na zatwierdzenie przez zespół.';
  }

  return 'Ogłoszenie jest w przygotowaniu.';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString('pl-PL');
}
