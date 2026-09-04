'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  ShieldAlert,
  Phone,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  formatPrice,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '@/lib/listings';
import {
  approveAdminPublicListingSubmission,
  fetchAdminPublicListingSubmission,
  fetchAdminPublicListingSubmissions,
  rejectAdminPublicListingSubmission,
  type AdminPublicListingSubmissionListItem,
  type SellerPublicListingSubmissionDetail,
} from '@/lib/public-listing-submissions';
import { cn } from '@/lib/utils';

export default function AdminListingSubmissionsPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [items, setItems] = useState<AdminPublicListingSubmissionListItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] =
    useState<AdminPublicListingSubmissionListItem | null>(null);
  const [previewDetail, setPreviewDetail] =
    useState<SellerPublicListingSubmissionDetail | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    async function loadSubmissions() {
      try {
        const result = await fetchAdminPublicListingSubmissions();
        if (!isMounted) return;
        setItems(result);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSubmissions();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, refreshToken]);

  async function approveSubmission(item: AdminPublicListingSubmissionListItem) {
    const confirmed = await confirm({
      title: 'Zatwierdzić publiczną ofertę?',
      description: formatModerationDecisionSummary(
        item,
        'Oferta zostanie opublikowana w katalogu publicznym. Sprawdź checklistę, dane kontaktowe i sygnały moderacji przed zatwierdzeniem.',
      ),
      confirmLabel: 'Zatwierdź ofertę',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setUpdatingId(item.id);

    try {
      await approveAdminPublicListingSubmission(item.id);
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      showSuccessToast({
        title: 'Ogłoszenie zatwierdzone',
        description: 'Oferta została opublikowana w katalogu.',
      });
    } catch (approveError) {
      showErrorToast({
        title: 'Nie udało się zatwierdzić',
        description: getApiErrorMessage(approveError),
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function openPreview(item: AdminPublicListingSubmissionListItem) {
    setPreviewItem(item);
    setPreviewDetail(null);
    setPreviewError(null);
    setIsLoadingPreview(true);

    try {
      const detail = await fetchAdminPublicListingSubmission(item.id);
      setPreviewDetail(detail);
    } catch (previewFetchError) {
      setPreviewError(getApiErrorMessage(previewFetchError));
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function closePreview() {
    setPreviewItem(null);
    setPreviewDetail(null);
    setPreviewError(null);
    setIsLoadingPreview(false);
  }

  async function rejectSubmission(item: AdminPublicListingSubmissionListItem) {
    const reason = rejectReasons[item.id]?.trim() ?? '';

    if (!reason) {
      showErrorToast({
        title: 'Podaj powód odrzucenia',
        description: 'Powód zostanie wysłany do właściciela ogłoszenia.',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Odrzucić publiczną ofertę?',
      description: formatModerationDecisionSummary(
        item,
        `Powód wysłany do właściciela: ${reason}`,
      ),
      confirmLabel: 'Odrzuć ofertę',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setUpdatingId(item.id);

    try {
      await rejectAdminPublicListingSubmission(item.id, reason);
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setRejectReasons((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      showSuccessToast({
        title: 'Ogłoszenie odrzucone',
        description: 'Właściciel otrzyma email z powodem odrzucenia.',
      });
    } catch (rejectError) {
      showErrorToast({
        title: 'Nie udało się odrzucić',
        description: getApiErrorMessage(rejectError),
      });
    } finally {
      setUpdatingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Moderacja zgłoszeń jest dostępna tylko dla administratorów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">
              Moderacja zgłoszeń
            </h1>
            <Badge variant="outline" className="rounded-full">
              {items.length} do sprawdzenia
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Zatwierdzaj lub odrzucaj przejęte ogłoszenia bez zmiany właściciela.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setRefreshToken((current) => current + 1);
          }}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            Brak zgłoszeń do moderacji
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lista obejmuje tylko zgłoszenia przejęte przez właściciela i
            oczekujące na publikację.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <SubmissionModerationCard
              key={item.id}
              item={item}
              reason={rejectReasons[item.id] ?? ''}
              isUpdating={updatingId === item.id}
              onReasonChange={(reason) =>
                setRejectReasons((current) => ({
                  ...current,
                  [item.id]: reason,
                }))
              }
              onPreview={() => openPreview(item)}
              onApprove={() => approveSubmission(item)}
              onReject={() => rejectSubmission(item)}
            />
          ))}
        </div>
      )}

      {previewItem ? (
        <SubmissionPreviewModal
          item={previewItem}
          detail={previewDetail}
          isLoading={isLoadingPreview}
          error={previewError}
          onClose={closePreview}
        />
      ) : null}
    </div>
  );
}

function SubmissionModerationCard({
  item,
  reason,
  isUpdating,
  onReasonChange,
  onPreview,
  onApprove,
  onReject,
}: {
  item: AdminPublicListingSubmissionListItem;
  reason: string;
  isUpdating: boolean;
  onReasonChange: (reason: string) => void;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const checklist = getModerationChecklist(item);

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {PROPERTY_TYPE_LABELS[item.propertyType]}
            </Badge>
            <Badge variant="secondary">
              {TRANSACTION_TYPE_LABELS[item.transactionType]}
            </Badge>
            <Badge variant="outline">
              Przejęto{' '}
              {item.claimedAt ? formatDate(item.claimedAt) : 'brak daty'}
            </Badge>
          </div>

          <h2 className="mt-3 font-heading text-lg font-semibold">
            {item.title}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {item.city ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {item.city}
              </span>
            ) : null}
            <span>
              {item.price
                ? formatPrice(item.price, item.currency)
                : 'Cena do ustalenia'}
            </span>
            <span>Dodano {formatDate(item.createdAt)}</span>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Dane właściciela
            </p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <ContactDetail label="Osoba" value={item.ownerName} />
              <ContactDetail icon={Mail} label="Email" value={item.email} />
              <ContactDetail icon={Phone} label="Telefon" value={item.phone} />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <ModerationChecklist items={checklist} />

          <Button
            variant="outline"
            className="cursor-pointer gap-2 rounded-xl"
            disabled={isUpdating}
            onClick={onPreview}
          >
            <Eye className="h-4 w-4" />
            Podgląd
          </Button>

          <Button
            className="cursor-pointer gap-2 rounded-xl"
            disabled={isUpdating}
            onClick={onApprove}
          >
            <CheckCircle2 className="h-4 w-4" />
            Zatwierdź
          </Button>

          <textarea
            value={reason}
            rows={4}
            placeholder="Powód odrzucenia widoczny w emailu do właściciela"
            className="w-full resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            disabled={isUpdating}
            onChange={(event) => onReasonChange(event.target.value)}
          />

          <Button
            variant="destructive"
            className="cursor-pointer gap-2 rounded-xl"
            disabled={isUpdating}
            onClick={onReject}
          >
            <XCircle className="h-4 w-4" />
            Odrzuć
          </Button>
        </div>
      </div>
    </article>
  );
}

function ContactDetail({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value || 'Brak danych'}
      </p>
    </div>
  );
}

function SubmissionPreviewModal({
  item,
  detail,
  isLoading,
  error,
  onClose,
}: {
  item: AdminPublicListingSubmissionListItem;
  detail: SellerPublicListingSubmissionDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const listing = detail?.listing;
  const address = detail?.address;
  const publicSettings = detail?.publicSettings;
  const images = detail?.images ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Zamknij podgląd"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Podgląd zgłoszenia
            </p>
            <h2 className="mt-1 truncate font-heading text-xl font-semibold text-foreground">
              {item.title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={onClose}
            aria-label="Zamknij podgląd"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : detail ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
              <div className="space-y-5">
                {images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {images.map((image, index) => (
                      <div
                        key={`${image.url}-${index}`}
                        aria-label={image.altText || detail.listing.title}
                        className="aspect-[4/3] rounded-xl border border-border bg-muted bg-cover bg-center"
                        role="img"
                        style={{ backgroundImage: `url(${image.url})` }}
                      >
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                    Brak zdjęć w zgłoszeniu.
                  </div>
                )}

                <PreviewSection title="Opis">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {getTextValue(listing?.description) || 'Brak opisu'}
                  </p>
                </PreviewSection>

                <PreviewSection title="Ustawienia publikacji">
                  <PreviewGrid
                    rows={[
                      [
                        'Tytuł publiczny',
                        getTextValue(publicSettings?.publicTitle) ||
                          getTextValue(listing?.title),
                      ],
                      [
                        'Dokładny adres publicznie',
                        publicSettings?.showExactAddressOnPublicPage
                          ? 'Tak'
                          : 'Nie',
                      ],
                    ]}
                  />
                </PreviewSection>
              </div>

              <div className="space-y-5">
                <PreviewSection title="Oferta">
                  <PreviewGrid
                    rows={[
                      [
                        'Typ',
                        PROPERTY_TYPE_LABELS[detail.propertyType] ??
                          detail.propertyType,
                      ],
                      [
                        'Transakcja',
                        TRANSACTION_TYPE_LABELS[detail.transactionType] ??
                          detail.transactionType,
                      ],
                      [
                        'Cena',
                        detail.price
                          ? formatPrice(detail.price, detail.currency)
                          : 'Brak',
                      ],
                      ['Powierzchnia', formatArea(listing?.areaM2)],
                      ['Działka', formatArea(listing?.plotAreaM2)],
                      ['Pokoje', getTextValue(listing?.rooms)],
                      ['Łazienki', getTextValue(listing?.bathrooms)],
                      ['Piętro', getTextValue(listing?.floor)],
                      ['Pięter', getTextValue(listing?.totalFloors)],
                      ['Rok budowy', getTextValue(listing?.yearBuilt)],
                    ]}
                  />
                </PreviewSection>

                <PreviewSection title="Lokalizacja">
                  <PreviewGrid
                    rows={[
                      ['Miasto', getTextValue(address?.city)],
                      ['Dzielnica', getTextValue(address?.district)],
                      ['Ulica', getTextValue(address?.street)],
                      ['Kod pocztowy', getTextValue(address?.postalCode)],
                      ['Województwo', getTextValue(address?.voivodeship)],
                    ]}
                  />
                </PreviewSection>

                <PreviewSection title="Właściciel">
                  <PreviewGrid
                    rows={[
                      ['Osoba', detail.ownerName],
                      ['Email', detail.email],
                      ['Telefon', detail.phone],
                      ['Agencja', detail.agencyName ?? 'Brak'],
                    ]}
                  />
                </PreviewSection>

                <ModerationChecklist items={getModerationChecklist(item)} />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="font-heading text-base font-semibold text-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PreviewGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 rounded-lg border border-border bg-card px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)]"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words font-medium text-foreground">
            {value || 'Brak'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface ModerationChecklistItem {
  label: string;
  detail: string;
  status: 'ok' | 'warning' | 'blocked';
  blocksApproval?: boolean;
}

function ModerationChecklist({ items }: { items: ModerationChecklistItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="h-4 w-4 text-status-warning" />
        Checklist moderacji
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
              getChecklistItemClasses(item.status),
            )}
          >
            <span
              className={cn(
                'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
                item.status === 'ok' && 'bg-status-success',
                item.status === 'warning' && 'bg-status-warning',
                item.status === 'blocked' && 'bg-destructive',
              )}
            />
            <span className="min-w-0">
              <span className="block font-medium text-foreground">
                {item.label}
              </span>
              <span className="block text-xs leading-5 text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getChecklistItemClasses(
  status: ModerationChecklistItem['status'],
): string {
  if (status === 'ok') {
    return 'border-status-success/25 bg-status-success-bg/60';
  }

  if (status === 'warning') {
    return 'border-status-warning/25 bg-status-warning-bg/60';
  }

  return 'border-destructive/25 bg-destructive/10';
}

function getModerationChecklist(
  item: AdminPublicListingSubmissionListItem,
): ModerationChecklistItem[] {
  const hasContact = Boolean(item.ownerName.trim() && item.email && item.phone);
  const hasImages = item.imageCount > 0;
  const validPrice = item.price !== null && item.price > 0 ? item.price : null;
  const hasPrice = validPrice !== null;
  const descriptionLength = item.description?.trim().length ?? 0;
  const hasDescription = descriptionLength >= 80;
  const hasAbuseSignals = item.moderationReasons.length > 0;

  return [
    {
      label: 'Dane kontaktowe',
      detail: hasContact
        ? 'Imię, email i telefon są uzupełnione.'
        : 'Brakuje właściciela, emaila albo telefonu.',
      status: hasContact ? 'ok' : 'blocked',
      blocksApproval: !hasContact,
    },
    {
      label: 'Zdjęcia',
      detail:
        item.imageCount > 0
          ? `${item.imageCount} zdjęć w zgłoszeniu.`
          : 'Brak zdjęć. Oferta wymaga ręcznej decyzji przed publikacją.',
      status: hasImages ? 'ok' : 'blocked',
      blocksApproval: !hasImages,
    },
    {
      label: 'Cena',
      detail: hasPrice
        ? formatPrice(validPrice, item.currency)
        : 'Cena nie została podana albo jest nieprawidłowa.',
      status: hasPrice ? 'ok' : 'blocked',
      blocksApproval: !hasPrice,
    },
    {
      label: 'Opis',
      detail: hasDescription
        ? `${descriptionLength} znaków opisu.`
        : 'Opis jest krótki. Poproś właściciela o uzupełnienie albo odrzuć z konkretnym powodem.',
      status: hasDescription ? 'ok' : 'warning',
    },
    {
      label: 'Sygnały abuse',
      detail: hasAbuseSignals
        ? item.moderationReasons.map(formatModerationReason).join(', ')
        : 'Brak sygnałów abuse z automatycznej moderacji.',
      status: hasAbuseSignals ? 'blocked' : 'ok',
      blocksApproval: hasAbuseSignals,
    },
  ];
}

function formatModerationDecisionSummary(
  item: AdminPublicListingSubmissionListItem,
  intro: string,
): string {
  const checklist = getModerationChecklist(item)
    .map((entry) => `${entry.label}: ${entry.detail}`)
    .join(' ');

  return `${intro} Oferta: ${item.title}. Właściciel: ${item.ownerName}. ${checklist}`;
}

function formatModerationReason(reason: string): string {
  const labels: Record<string, string> = {
    contains_links: 'opis zawiera linki',
    too_many_links: 'za dużo linków w opisie',
    repeated_characters: 'podejrzane powtórzenia znaków',
    suspicious_terms: 'podejrzane słowa w treści',
    short_description: 'krótki opis',
    missing_images: 'brak zdjęć',
    very_low_price_per_m2: 'bardzo niska cena za m²',
  };

  return labels[reason] ?? reason;
}

function getTextValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return String(value);
}

function formatArea(value: unknown): string {
  const text = getTextValue(value);
  return text ? `${text} m²` : '';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
