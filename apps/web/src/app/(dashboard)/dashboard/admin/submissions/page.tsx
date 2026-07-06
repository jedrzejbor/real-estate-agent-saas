'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldAlert,
  Phone,
  RefreshCw,
  ShieldCheck,
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
  fetchAdminPublicListingSubmissions,
  rejectAdminPublicListingSubmission,
  type AdminPublicListingSubmissionListItem,
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
    const checklist = getModerationChecklist(item);
    const blockingItems = checklist.filter((entry) => entry.blocksApproval);

    if (blockingItems.length > 0) {
      showErrorToast({
        title: 'Nie można zatwierdzić bez pełnej kontroli',
        description: blockingItems.map((entry) => entry.label).join(', '),
      });
      return;
    }

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
              onApprove={() => approveSubmission(item)}
              onReject={() => rejectSubmission(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionModerationCard({
  item,
  reason,
  isUpdating,
  onReasonChange,
  onApprove,
  onReject,
}: {
  item: AdminPublicListingSubmissionListItem;
  reason: string;
  isUpdating: boolean;
  onReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const checklist = getModerationChecklist(item);
  const canApprove = checklist.every((entry) => !entry.blocksApproval);

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
            <span className="text-xs text-muted-foreground">
              Claim {item.claimedAt ? formatDate(item.claimedAt) : 'brak daty'}
            </span>
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

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {item.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {item.phone}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Właściciel: {item.ownerName}
          </p>
        </div>

        <div className="grid gap-3">
          <ModerationChecklist items={checklist} />

          <Button
            className="gap-2 rounded-xl"
            disabled={isUpdating || !canApprove}
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
            className="gap-2 rounded-xl"
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

interface ModerationChecklistItem {
  label: string;
  detail: string;
  status: 'ok' | 'warning' | 'blocked';
  blocksApproval?: boolean;
}

function ModerationChecklist({ items }: { items: ModerationChecklistItem[] }) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-950">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        Checklist moderacji
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-card px-3 py-2 text-sm"
          >
            <span
              className={cn(
                'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
                item.status === 'ok' && 'bg-status-success',
                item.status === 'warning' && 'bg-amber-500',
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
        ? `${item.ownerName}, ${item.email}, ${item.phone}`
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
        ? item.moderationReasons.join(', ')
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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
