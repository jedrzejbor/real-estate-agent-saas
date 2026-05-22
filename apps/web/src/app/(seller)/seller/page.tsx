'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  Edit3,
  Eye,
  Archive,
  CheckCircle2,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  PlusCircle,
  RefreshCw,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AGENT_DASHBOARD_PATH, isPrivateSellerUser } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  formatPrice,
  ListingPublicationStatus,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/listings';
import {
  fetchSellerPublicListingSubmissions,
  renewSellerPublicListingSubmission,
  type SellerPublicListingSubmissionListItem,
  type SellerPublicListingSubmissionStatus,
  unpublishSellerPublicListingSubmission,
} from '@/lib/public-listing-submissions';
import {
  fetchSellerPublicInquiries,
  PublicLeadStatus,
  PUBLIC_LEAD_STATUS_LABELS,
  updateSellerPublicInquiryStatus,
  type PublicInquiry,
  type PublicLeadStatus as PublicLeadStatusValue,
} from '@/lib/public-inquiries';
import { Logo } from '@/components/common/logo';

export default function SellerDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const [submissions, setSubmissions] = useState<
    SellerPublicListingSubmissionListItem[]
  >([]);
  const [inquiries, setInquiries] = useState<PublicInquiry[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [updatingInquiryId, setUpdatingInquiryId] = useState<string | null>(
    null,
  );
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<
    string | null
  >(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

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

    async function loadSubmissions() {
      setIsLoadingSubmissions(true);
      setSubmissionError(null);
      setInquiryError(null);

      try {
        const [submissionResult, inquiryResult] = await Promise.allSettled([
          fetchSellerPublicListingSubmissions(),
          fetchSellerPublicInquiries({
            page: 1,
            limit: 5,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
          }),
        ]);

        if (!cancelled) {
          if (submissionResult.status === 'fulfilled') {
            setSubmissions(submissionResult.value);
          } else {
            setSubmissionError(getApiErrorMessage(submissionResult.reason));
          }

          if (inquiryResult.status === 'fulfilled') {
            setInquiries(inquiryResult.value.data);
          } else {
            setInquiryError(getApiErrorMessage(inquiryResult.reason));
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSubmissions(false);
        }
      }
    }

    void loadSubmissions();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isPrivateSeller, user]);

  async function updateInquiryStatus(
    id: string,
    status:
      | typeof PublicLeadStatus.CONTACTED
      | typeof PublicLeadStatus.ARCHIVED,
  ) {
    setUpdatingInquiryId(id);
    setInquiryError(null);

    try {
      const updated = await updateSellerPublicInquiryStatus(id, status);
      setInquiries((current) =>
        current.map((inquiry) => (inquiry.id === id ? updated : inquiry)),
      );
    } catch (error) {
      setInquiryError(getApiErrorMessage(error));
    } finally {
      setUpdatingInquiryId(null);
    }
  }

  async function renewSubmission(id: string) {
    setUpdatingSubmissionId(id);
    setSubmissionError(null);

    try {
      const updated = await renewSellerPublicListingSubmission(id);
      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === id ? updated : submission,
        ),
      );
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error));
    } finally {
      setUpdatingSubmissionId(null);
    }
  }

  async function unpublishSubmission(id: string) {
    setUpdatingSubmissionId(id);
    setSubmissionError(null);

    try {
      const updated = await unpublishSellerPublicListingSubmission(id);
      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === id ? updated : submission,
        ),
      );
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error));
    } finally {
      setUpdatingSubmissionId(null);
    }
  }

  if (isLoading || !user || !isPrivateSeller) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label="Panel właściciela EstateFlow">
            <Logo size="sm" />
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/oferty"
              className="hidden h-9 items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted sm:inline-flex"
            >
              Katalog ofert
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Wyloguj
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Panel właściciela
            </p>
            <h1 className="mt-2 max-w-3xl font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Zarządzaj swoim ogłoszeniem bez panelu CRM
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Dodaj ogłoszenie, przejdź weryfikację i pokaż nieruchomość w
              publicznym katalogu EstateFlow.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">
              Konto: {user.email}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Widok uproszczony dla właścicieli prywatnych.
            </p>
          </div>
        </div>

        {isLoadingSubmissions ? (
          <SellerSubmissionsLoading />
        ) : submissionError ? (
          <SellerSubmissionsError message={submissionError} />
        ) : submissions.length > 0 ? (
          <>
            <SellerSubmissionList
              submissions={submissions}
              updatingSubmissionId={updatingSubmissionId}
              onRenew={renewSubmission}
              onUnpublish={unpublishSubmission}
            />
            <SellerInquiriesSection
              inquiries={inquiries}
              error={inquiryError}
              updatingInquiryId={updatingInquiryId}
              onStatusChange={updateInquiryStatus}
            />
          </>
        ) : (
          <SellerEmptyState />
        )}
      </section>
    </main>
  );
}

function SellerInquiriesSection({
  inquiries,
  error,
  updatingInquiryId,
  onStatusChange,
}: {
  inquiries: PublicInquiry[];
  error: string | null;
  updatingInquiryId: string | null;
  onStatusChange: (
    id: string,
    status:
      | typeof PublicLeadStatus.CONTACTED
      | typeof PublicLeadStatus.ARCHIVED,
  ) => void;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Zapytania</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ostatnie wiadomości wysłane z publicznych stron Twoich ogłoszeń.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-white p-6 text-sm text-destructive shadow-sm">
          {error}
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-heading text-xl font-semibold">
            Nie masz jeszcze zapytań
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Gdy ktoś napisze z publicznej strony Twojej oferty, pokażemy tę
            wiadomość tutaj razem ze statusem.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {inquiries.map((inquiry) => (
            <SellerInquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              isUpdating={updatingInquiryId === inquiry.id}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SellerInquiryCard({
  inquiry,
  isUpdating,
  onStatusChange,
}: {
  inquiry: PublicInquiry;
  isUpdating: boolean;
  onStatusChange: (
    id: string,
    status:
      | typeof PublicLeadStatus.CONTACTED
      | typeof PublicLeadStatus.ARCHIVED,
  ) => void;
}) {
  const status = SELLER_INQUIRY_STATUS_COPY[inquiry.status];

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
            >
              {PUBLIC_LEAD_STATUS_LABELS[inquiry.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(inquiry.createdAt)}
            </span>
          </div>

          <h3 className="mt-3 font-heading text-lg font-semibold">
            {inquiry.fullName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {inquiry.listing?.title ?? 'Ogłoszenie niedostępne'}
          </p>

          {inquiry.message ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground">
              {inquiry.message}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Zapytanie bez dodatkowej wiadomości.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 text-sm">
          {inquiry.email ? (
            <a
              href={`mailto:${inquiry.email}`}
              onClick={() =>
                onStatusChange(inquiry.id, PublicLeadStatus.CONTACTED)
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold transition-colors hover:bg-muted"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          ) : null}
          {inquiry.phone ? (
            <a
              href={`tel:${inquiry.phone}`}
              onClick={() =>
                onStatusChange(inquiry.id, PublicLeadStatus.CONTACTED)
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4" />
              Telefon
            </a>
          ) : null}
          {inquiry.status !== PublicLeadStatus.CONTACTED ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() =>
                onStatusChange(inquiry.id, PublicLeadStatus.CONTACTED)
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Oznacz kontakt
            </button>
          ) : null}
          {inquiry.status !== PublicLeadStatus.ARCHIVED ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() =>
                onStatusChange(inquiry.id, PublicLeadStatus.ARCHIVED)
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 font-semibold transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Archiwizuj
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SellerSubmissionList({
  submissions,
  updatingSubmissionId,
  onRenew,
  onUnpublish,
}: {
  submissions: SellerPublicListingSubmissionListItem[];
  updatingSubmissionId: string | null;
  onRenew: (id: string) => void;
  onUnpublish: (id: string) => void;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold">
            Moje ogłoszenia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Status publikacji i najważniejsze informacje o Twoich zgłoszeniach.
          </p>
        </div>
        <Link
          href="/dodaj-oferte"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ogłoszenie
        </Link>
      </div>

      <div className="grid gap-4">
        {submissions.map((submission) => (
          <SellerSubmissionCard
            key={submission.id}
            submission={submission}
            isUpdating={updatingSubmissionId === submission.id}
            onRenew={onRenew}
            onUnpublish={onUnpublish}
          />
        ))}
      </div>
    </section>
  );
}

function SellerSubmissionCard({
  submission,
  isUpdating,
  onRenew,
  onUnpublish,
}: {
  submission: SellerPublicListingSubmissionListItem;
  isUpdating: boolean;
  onRenew: (id: string) => void;
  onUnpublish: (id: string) => void;
}) {
  const status = getSellerSubmissionStatusCopy(submission);
  const isPublished =
    submission.publicationStatus === ListingPublicationStatus.PUBLISHED;
  const isExpired = isSellerSubmissionExpired(submission);
  const publicHref =
    submission.publishedListingSlug && isPublished && !isExpired
      ? `/oferty/${submission.publishedListingSlug}`
      : null;
  const canRenew = Boolean(submission.publishedListingId);
  const canUnpublish = Boolean(submission.publishedListingId && isPublished);

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:grid-cols-[180px_1fr]">
      <div
        className="min-h-40 bg-muted"
        style={
          submission.primaryImageUrl
            ? {
                backgroundImage: `url(${submission.primaryImageUrl})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : undefined
        }
        aria-label={
          submission.primaryImageUrl
            ? `Zdjęcie ogłoszenia ${submission.title}`
            : undefined
        }
      >
        {!submission.primaryImageUrl ? (
          <div className="flex h-full min-h-40 items-center justify-center text-muted-foreground">
            <Home className="h-8 w-8" />
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {PROPERTY_TYPE_LABELS[submission.propertyType]}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {TRANSACTION_TYPE_LABELS[submission.transactionType]}
              </span>
            </div>
            <h3 className="font-heading text-xl font-semibold">
              {submission.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {submission.city ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {submission.city}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Dodano {formatDate(submission.createdAt)}
              </span>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            {submission.price
              ? formatPrice(submission.price, submission.currency)
              : 'Cena do ustalenia'}
          </p>
          {submission.viewCount !== null ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              {formatViewCount(submission.viewCount)}
            </p>
          ) : null}
          {submission.inquiryCount !== null ? (
            <p className="mt-2 ml-0 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground sm:ml-4">
              <MessageSquareText className="h-4 w-4" />
              {formatInquiryCount(submission.inquiryCount)}
            </p>
          ) : null}
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {status.description}
          </p>
          {submission.expiresAt ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {isExpired ? 'Wygasło' : 'Ważne do'}{' '}
              {formatDate(submission.expiresAt)}
            </p>
          ) : null}
          {submission.unpublishedAt ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Wycofano {formatDate(submission.unpublishedAt)}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/seller/listings/${submission.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Eye className="h-4 w-4" />
            Szczegóły
          </Link>
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
              onClick={() => onRenew(submission.id)}
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
              onClick={() => onUnpublish(submission.id)}
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
      </div>
    </article>
  );
}

function SellerSubmissionsLoading() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Pobieramy Twoje ogłoszenia...
      </p>
    </section>
  );
}

function SellerSubmissionsError({ message }: { message: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">
        Nie udało się pobrać ogłoszeń
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

function SellerEmptyState() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Home className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-semibold">
        Nie masz jeszcze ogłoszeń
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Dodaj pierwszą nieruchomość, a po weryfikacji będzie mogła pojawić się w
        katalogu ofert i na mapie.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dodaj-oferte"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Dodaj ogłoszenie
        </Link>
        <Link
          href="/oferty"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Building2 className="h-4 w-4" />
          Zobacz katalog
        </Link>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        <Step
          title="1. Dodaj dane"
          description="Uzupełnij opis, cenę i lokalizację."
        />
        <Step
          title="2. Dodaj zdjęcia"
          description="Pokaż nieruchomość kupującym."
        />
        <Step
          title="3. Opublikuj"
          description="Po weryfikacji pokażemy ofertę publicznie."
        />
      </div>
    </section>
  );
}

function Step({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {title}
        <ArrowRight className="h-3.5 w-3.5 text-primary" />
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

const SELLER_STATUS_COPY: Record<
  SellerPublicListingSubmissionStatus,
  { label: string; description: string; className: string }
> = {
  draft: {
    label: 'Szkic',
    description: 'Ogłoszenie jest zapisane roboczo i nie zostało wysłane.',
    className: 'bg-muted text-muted-foreground',
  },
  pending_email_verification: {
    label: 'Czeka na email',
    description:
      'Sprawdź skrzynkę i potwierdź adres email, żeby kontynuować publikację.',
    className: 'bg-amber-100 text-amber-900',
  },
  verified: {
    label: 'W weryfikacji',
    description:
      'Twoje ogłoszenie oczekuje na publikację. Zazwyczaj trwa to do 24h.',
    className: 'bg-blue-100 text-blue-900',
  },
  published: {
    label: 'Opublikowane',
    description: 'Ogłoszenie jest widoczne publicznie w katalogu.',
    className: 'bg-emerald-100 text-emerald-900',
  },
  claimed: {
    label: 'W weryfikacji przez zespół',
    description:
      'Ogłoszenie jest przypisane do Twojego konta i czeka na zatwierdzenie przez zespół.',
    className: 'bg-blue-100 text-blue-900',
  },
  rejected: {
    label: 'Wymaga poprawek',
    description:
      'Ogłoszenie wymaga korekty przed publikacją. Przygotujemy tu edycję danych.',
    className: 'bg-red-100 text-red-900',
  },
  expired: {
    label: 'Wygasłe',
    description: 'Link weryfikacyjny albo ogłoszenie wygasło.',
    className: 'bg-stone-200 text-stone-800',
  },
};

const SELLER_PUBLICATION_STATUS_COPY = {
  expired: {
    label: 'Wygasłe',
    description:
      'Ogłoszenie nie jest widoczne publicznie. Odnów je, żeby wróciło do katalogu.',
    className: 'bg-stone-200 text-stone-800',
  },
  unpublished: {
    label: 'Wycofane',
    description: 'Ogłoszenie zostało wycofane z publicznego katalogu.',
    className: 'bg-stone-200 text-stone-800',
  },
} satisfies Record<
  'expired' | 'unpublished',
  { label: string; description: string; className: string }
>;

function getSellerSubmissionStatusCopy(
  submission: SellerPublicListingSubmissionListItem,
) {
  if (submission.publicationStatus === ListingPublicationStatus.PUBLISHED) {
    return SELLER_STATUS_COPY.published;
  }

  if (submission.publicationStatus === ListingPublicationStatus.UNPUBLISHED) {
    return SELLER_PUBLICATION_STATUS_COPY.unpublished;
  }

  if (isSellerSubmissionExpired(submission)) {
    return SELLER_PUBLICATION_STATUS_COPY.expired;
  }

  return SELLER_STATUS_COPY[submission.status];
}

function isSellerSubmissionExpired(
  submission: SellerPublicListingSubmissionListItem,
): boolean {
  return Boolean(
    submission.expiresAt &&
    new Date(submission.expiresAt).getTime() <= Date.now(),
  );
}

const SELLER_INQUIRY_STATUS_COPY: Record<
  PublicLeadStatusValue,
  { className: string }
> = {
  new: { className: 'bg-blue-100 text-blue-900' },
  contacted: { className: 'bg-violet-100 text-violet-900' },
  qualified: { className: 'bg-emerald-100 text-emerald-900' },
  converted_to_client: { className: 'bg-emerald-100 text-emerald-900' },
  spam: { className: 'bg-red-100 text-red-900' },
  archived: { className: 'bg-stone-200 text-stone-800' },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatViewCount(count: number): string {
  const normalizedCount = Math.max(0, Math.trunc(count));
  const pluralRule = new Intl.PluralRules('pl-PL').select(normalizedCount);
  const label = pluralRule === 'one' ? 'wyświetlenie' : 'wyświetleń';

  return `${normalizedCount.toLocaleString('pl-PL')} ${label}`;
}

function formatInquiryCount(count: number): string {
  const normalizedCount = Math.max(0, Math.trunc(count));
  const pluralRule = new Intl.PluralRules('pl-PL').select(normalizedCount);
  const label = pluralRule === 'one' ? 'zapytanie' : 'zapytań';

  return `${normalizedCount.toLocaleString('pl-PL')} ${label}`;
}
