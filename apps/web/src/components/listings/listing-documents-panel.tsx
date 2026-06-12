'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import {
  deleteListingDocument,
  downloadListingDocument,
  fetchListingDocuments,
  LISTING_DOCUMENT_CATEGORY_LABELS,
  LISTING_DOCUMENT_STATUS_LABELS,
  ListingDocumentCategory,
  ListingDocumentStatus,
  updateListingDocument,
  uploadListingDocument,
  type ListingDocument,
  type ListingDocumentChecklist,
  type ListingDocumentsResponse,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingDocumentsPanelProps {
  listingId: string;
}

const DOCUMENT_CATEGORIES = Object.values(ListingDocumentCategory);
const DOCUMENT_STATUSES = Object.values(ListingDocumentStatus).filter(
  (status) => status !== ListingDocumentStatus.MISSING,
);

export function ListingDocumentsPanel({ listingId }: ListingDocumentsPanelProps) {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<ListingDocumentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ListingDocumentCategory>(
    ListingDocumentCategory.AGENCY_AGREEMENT,
  );
  const [displayName, setDisplayName] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setData(await fetchListingDocuments(listingId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać dokumentów',
      );
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const checklist = data?.checklist;
  const documents = data?.documents ?? [];

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      showError({
        title: 'Wybierz plik',
        description: 'Dodaj PDF, JPG albo PNG przed wysłaniem dokumentu.',
      });
      return;
    }

    try {
      setIsUploading(true);
      await uploadListingDocument(listingId, {
        file: selectedFile,
        category,
        displayName: displayName || selectedFile.name,
      });
      setSelectedFile(null);
      setDisplayName('');
      await load();
      success({
        title: 'Dokument dodany',
        description: 'Plik został zapisany prywatnie przy ofercie.',
      });
    } catch (err) {
      showError({
        title: 'Nie udało się dodać dokumentu',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleStatusChange(
    document: ListingDocument,
    status: ListingDocumentStatus,
  ) {
    try {
      await updateListingDocument(listingId, document.id, { status });
      await load();
      success({
        title: 'Status dokumentu zmieniony',
        description: LISTING_DOCUMENT_STATUS_LABELS[status],
      });
    } catch (err) {
      showError({
        title: 'Nie udało się zmienić statusu',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }

  async function handleDownload(document: ListingDocument) {
    try {
      const { blob, filename } = await downloadListingDocument(
        listingId,
        document.id,
      );
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = filename ?? document.originalFilename ?? document.displayName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError({
        title: 'Nie udało się pobrać dokumentu',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }

  async function handleDelete(document: ListingDocument) {
    const confirmed = await confirm({
      title: 'Usunąć dokument?',
      description: `Dokument "${document.displayName}" zniknie z listy oferty.`,
      confirmLabel: 'Usuń dokument',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await deleteListingDocument(listingId, document.id);
      await load();
      success({
        title: 'Dokument usunięty',
        description: 'Dokument został usunięty z listy oferty.',
      });
    } catch (err) {
      showError({
        title: 'Nie udało się usunąć dokumentu',
        description:
          err instanceof Error ? err.message : 'Spróbuj ponownie za chwilę.',
      });
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Dokumenty
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prywatne dokumenty oferty, checklist i statusy weryfikacji.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={load}
          disabled={isLoading}
          className="w-fit gap-1.5 rounded-xl"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {checklist ? (
        <ChecklistSummary
          checklist={checklist}
          selectedCategory={category}
          onCategorySelect={setCategory}
        />
      ) : null}

      <form
        onSubmit={handleUpload}
        className="mt-5 grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-3 md:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Kategoria
          </span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as ListingDocumentCategory)
            }
            className="h-8 w-full rounded-lg border border-border/80 bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {LISTING_DOCUMENT_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Nazwa dokumentu
          </span>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Opcjonalnie"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Plik PDF/JPG/PNG
          </span>
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex items-end">
          <Button
            type="submit"
            size="sm"
            disabled={isUploading}
            className="w-full gap-1.5 rounded-xl"
          >
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {isLoading && documents.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            Ładowanie dokumentów...
          </div>
        ) : null}
        {!isLoading && documents.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            Brak dokumentów. Dodaj pierwszy plik, aby rozpocząć checklistę
            kompletności.
          </div>
        ) : null}
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            onStatusChange={handleStatusChange}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistSummary({
  checklist,
  selectedCategory,
  onCategorySelect,
}: {
  checklist: ListingDocumentChecklist;
  selectedCategory: ListingDocumentCategory;
  onCategorySelect: (category: ListingDocumentCategory) => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Kompletność dokumentów
          </p>
          <p className="text-xs text-muted-foreground">
            {checklist.summary.approved}/{checklist.summary.required}{' '}
            wymaganych zaakceptowanych
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{checklist.summary.completionPct}%</Badge>
          {checklist.summary.needsCorrection > 0 ? (
            <Badge variant="warning">
              {checklist.summary.needsCorrection} do poprawy
            </Badge>
          ) : null}
          {checklist.summary.missing > 0 ? (
            <Badge variant="destructive">
              {checklist.summary.missing} brakujące
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {checklist.items.map((item) => (
          <button
            key={item.category}
            type="button"
            aria-pressed={selectedCategory === item.category}
            onClick={() => onCategorySelect(item.category)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border border-transparent bg-card px-3 py-2 text-left transition-colors outline-none hover:border-border/80 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              selectedCategory === item.category &&
                'border-primary/50 bg-primary/5',
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-left text-sm font-medium text-foreground">
                {item.displayName}
              </p>
              <p className="text-left text-xs text-muted-foreground">
                {item.required ? 'Wymagany' : 'Opcjonalny'}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentRow({
  document,
  onStatusChange,
  onDownload,
  onDelete,
}: {
  document: ListingDocument;
  onStatusChange: (
    document: ListingDocument,
    status: ListingDocumentStatus,
  ) => void;
  onDownload: (document: ListingDocument) => void;
  onDelete: (document: ListingDocument) => void;
}) {
  const fileSize = useMemo(
    () => formatFileSize(document.fileSize),
    [document.fileSize],
  );

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {document.displayName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {LISTING_DOCUMENT_CATEGORY_LABELS[document.category]} · {fileSize}
            </p>
            {document.note ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {document.note}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={document.status}
            onChange={(event) =>
              onStatusChange(
                document,
                event.target.value as ListingDocumentStatus,
              )
            }
            className="h-8 rounded-lg border border-border/80 bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_DOCUMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDownload(document)}
            disabled={!document.originalFilename}
            className="gap-1.5 rounded-xl"
          >
            <Download className="h-3.5 w-3.5" />
            Pobierz
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(document)}
            className="gap-1.5 rounded-xl text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Usuń
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ListingDocumentStatus }) {
  const variant =
    status === ListingDocumentStatus.APPROVED
      ? 'success'
      : status === ListingDocumentStatus.NEEDS_CORRECTION ||
          status === ListingDocumentStatus.EXPIRED
        ? 'warning'
        : status === ListingDocumentStatus.MISSING
          ? 'destructive'
          : 'secondary';

  return (
    <Badge variant={variant}>
      {status === ListingDocumentStatus.APPROVED ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : null}
      {LISTING_DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function formatFileSize(value: number | null): string {
  if (!value) return 'Bez pliku';
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1).replace('.0', '')} MB`;
  }
  return `${Math.max(Math.round(value / 1024), 1)} KB`;
}
