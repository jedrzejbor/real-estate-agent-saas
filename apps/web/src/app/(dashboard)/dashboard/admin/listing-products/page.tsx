'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  History,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { ListingProductEditor } from '@/components/admin/listing-product-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  archiveAdminListingProduct,
  createAdminListingProduct,
  createEmptyListingProductForm,
  fetchAdminListingProductHistory,
  fetchAdminListingProducts,
  formatListingProductPrice,
  LISTING_PRODUCT_TYPE_LABELS,
  restoreAdminListingProduct,
  toCreateListingProductInput,
  toListingProductForm,
  toUpdateListingProductInput,
  updateAdminListingProduct,
  validateListingProductForm,
  type AdminListingProduct,
  type AdminListingProductChange,
  type ListingProductFormErrors,
  type ListingProductFormValues,
} from '@/lib/listing-products';
import { cn } from '@/lib/utils';

const CHANGE_ACTION_LABELS: Record<AdminListingProductChange['action'], string> = {
  created: 'Utworzono',
  updated: 'Zaktualizowano',
  archived: 'Zarchiwizowano',
  restored: 'Przywrócono',
};

const CHANGE_FIELD_LABELS: Record<string, string> = {
  code: 'Kod',
  name: 'Nazwa',
  description: 'Opis',
  type: 'Typ',
  priceGrossAmount: 'Cena brutto',
  currency: 'Waluta',
  vatRateBasisPoints: 'VAT',
  durationDays: 'Czas działania',
  featuredTier: 'Tier wyróżnienia',
  priorityWeight: 'Waga priorytetu',
  fulfillmentParameters: 'Parametry realizacji',
  isPublic: 'Widoczność publiczna',
  isActive: 'Aktywność',
  sortOrder: 'Kolejność',
  providerPriceReference: 'Referencja operatora',
  archivedAt: 'Archiwizacja',
};

export default function AdminListingProductsPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [products, setProducts] = useState<AdminListingProduct[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('edit');
  const [form, setForm] = useState<ListingProductFormValues>(
    createEmptyListingProductForm,
  );
  const [errors, setErrors] = useState<ListingProductFormErrors>({});
  const [history, setHistory] = useState<AdminListingProductChange[]>([]);
  const [actionReason, setActionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingArchiveState, setIsChangingArchiveState] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = user?.role === 'admin';

  const selectedProduct = useMemo(
    () => products.find((product) => product.code === selectedCode) ?? null,
    [products, selectedCode],
  );

  const selectProduct = useCallback((product: AdminListingProduct) => {
    setMode('edit');
    setSelectedCode(product.code);
    setForm(toListingProductForm(product));
    setErrors({});
    setActionReason('');
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);
    fetchAdminListingProducts()
      .then((response) => {
        if (!isMounted) return;
        setProducts(response);
        const nextProduct =
          response.find((product) => product.code === selectedCode) ?? response[0];
        if (nextProduct) selectProduct(nextProduct);
        else {
          setMode('create');
          setSelectedCode(null);
          setForm(createEmptyListingProductForm());
        }
      })
      .catch((error) => {
        if (isMounted) setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // A manual refresh intentionally re-synchronizes the current editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, refreshToken, selectProduct]);

  const loadHistory = useCallback(async (code: string) => {
    setIsLoadingHistory(true);
    try {
      setHistory(await fetchAdminListingProductHistory(code));
    } catch {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || mode !== 'edit' || !selectedCode) {
      setHistory([]);
      return;
    }
    void loadHistory(selectedCode);
  }, [isAdmin, loadHistory, mode, selectedCode]);

  if (!isAdmin) {
    return <AccessDenied />;
  }

  function startCreating() {
    setMode('create');
    setSelectedCode(null);
    setForm(createEmptyListingProductForm());
    setErrors({});
    setActionReason('');
    setHistory([]);
  }

  function replaceProduct(updated: AdminListingProduct) {
    setProducts((current) =>
      [...current.filter((product) => product.code !== updated.code), updated].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code),
      ),
    );
    selectProduct(updated);
  }

  async function saveProduct() {
    const validation = validateListingProductForm(form);
    setErrors(validation.errors);
    if (!validation.data) {
      showErrorToast({
        title: 'Sprawdź formularz',
        description: 'Niektóre pola wymagają poprawy przed zapisem.',
      });
      return;
    }

    if (mode === 'edit' && !selectedProduct) return;
    const confirmed = await confirm({
      title: mode === 'create' ? 'Utworzyć produkt?' : 'Zapisać zmiany produktu?',
      description:
        mode === 'create'
          ? `Produkt „${validation.data.name}” zostanie utworzony ${validation.data.isPublic ? 'jako publiczny' : 'jako niepubliczny'}.`
          : buildSaveImpactDescription(selectedProduct!, validation.data),
      confirmLabel: mode === 'create' ? 'Utwórz produkt' : 'Zapisz zmiany',
      variant: validation.data.isPublic ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const updated =
        mode === 'create'
          ? await createAdminListingProduct(
              toCreateListingProductInput(validation.data),
            )
          : await updateAdminListingProduct(
              selectedProduct!.code,
              toUpdateListingProductInput(validation.data),
            );
      replaceProduct(updated);
      await loadHistory(updated.code);
      showSuccessToast({
        title: mode === 'create' ? 'Produkt utworzony' : 'Produkt zaktualizowany',
        description: `${updated.name}: ${formatListingProductPrice(updated.priceGrossAmount, updated.currency)} brutto.`,
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać produktu',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function changeArchiveState(action: 'archive' | 'restore') {
    if (!selectedProduct) return;
    const reason = actionReason.trim();
    if (reason.length < 3) {
      showErrorToast({
        title: 'Podaj powód operacji',
        description: 'Powód musi zawierać co najmniej 3 znaki.',
      });
      return;
    }

    const isArchive = action === 'archive';
    const confirmed = await confirm({
      title: isArchive ? 'Zarchiwizować produkt?' : 'Przywrócić produkt?',
      description: isArchive
        ? 'Produkt zostanie wyłączony i usunięty z publicznego katalogu. Historia oraz powiązania z zamówieniami pozostaną zachowane.'
        : 'Produkt zostanie przywrócony jako aktywny, ale pozostanie niepubliczny do czasu osobnego zapisu widoczności.',
      confirmLabel: isArchive ? 'Archiwizuj' : 'Przywróć',
      variant: isArchive ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    setIsChangingArchiveState(true);
    try {
      const updated = isArchive
        ? await archiveAdminListingProduct(selectedProduct.code, reason)
        : await restoreAdminListingProduct(selectedProduct.code, reason);
      replaceProduct(updated);
      await loadHistory(updated.code);
      showSuccessToast({
        title: isArchive ? 'Produkt zarchiwizowany' : 'Produkt przywrócony',
      });
    } catch (error) {
      showErrorToast({
        title: isArchive
          ? 'Nie udało się zarchiwizować produktu'
          : 'Nie udało się przywrócić produktu',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsChangingArchiveState(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">Produkty ogłoszeń</h1>
            <Badge variant="outline">{products.length} produktów</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ceny publikacji, przedłużeń i wyróżnień dla klientów indywidualnych.
            Publiczny cennik zawsze pobierze wartości z tego katalogu.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            disabled={isLoading}
            onClick={() => setRefreshToken((current) => current + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Odśwież
          </Button>
          <Button type="button" className="gap-2 rounded-xl" onClick={startCreating}>
            <PackagePlus className="h-4 w-4" />
            Nowy produkt
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Nie udało się pobrać katalogu.</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-border bg-card p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Katalog
          </div>
          {isLoading && products.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Brak produktów. Utwórz pierwszy produkt katalogowy.
            </p>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {products.map((product) => (
                <button
                  key={product.code}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    mode === 'edit' && selectedCode === product.code
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {product.name}
                    </span>
                    <ProductStatusBadge product={product} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{LISTING_PRODUCT_TYPE_LABELS[product.type]}</span>
                    <strong className="text-foreground">
                      {formatListingProductPrice(product.priceGrossAmount, product.currency)}
                    </strong>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <ListingProductEditor
              mode={mode}
              product={selectedProduct}
              value={form}
              errors={errors}
              isSaving={isSaving}
              actionReason={actionReason}
              isChangingArchiveState={isChangingArchiveState}
              onChange={(nextForm) => {
                setForm(nextForm);
                setErrors({});
              }}
              onSave={saveProduct}
              onActionReasonChange={setActionReason}
              onArchive={() => void changeArchiveState('archive')}
              onRestore={() => void changeArchiveState('restore')}
            />
          </section>

          {mode === 'edit' ? (
            <ProductHistory history={history} isLoading={isLoadingHistory} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ProductStatusBadge({ product }: { product: AdminListingProduct }) {
  if (product.archivedAt) return <Badge variant="destructive">Archiwum</Badge>;
  if (!product.isActive) return <Badge variant="warning">Nieaktywny</Badge>;
  if (product.isPublic) return <Badge variant="success">Publiczny</Badge>;
  return <Badge variant="muted">Ukryty</Badge>;
}

function ProductHistory({
  history,
  isLoading,
}: {
  history: AdminListingProductChange[];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Historia zmian</h2>
        <Badge variant="outline">{history.length}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Niezmienny audyt administratora, powodu operacji oraz wartości przed i po.
      </p>

      {isLoading ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted" />
      ) : history.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          Brak zapisanych zmian.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {history.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={entry.action === 'archived' ? 'destructive' : 'outline'}
                  >
                    {CHANGE_ACTION_LABELS[entry.action]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  administrator: {entry.actorUserId ?? 'system'}
                </span>
              </div>
              {entry.reason ? (
                <p className="mt-3 text-sm">
                  <span className="font-medium">Powód:</span> {entry.reason}
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                {entry.changes.map((change, index) => (
                  <div
                    key={`${change.field}-${index}`}
                    className="grid gap-1 rounded-lg bg-muted/40 px-3 py-2 text-xs md:grid-cols-[160px_1fr]"
                  >
                    <span className="font-medium text-foreground">
                      {CHANGE_FIELD_LABELS[change.field] ?? change.field}
                    </span>
                    <span className="min-w-0 break-words text-muted-foreground">
                      {formatChangeValue(change.field, change.oldValue)} →{' '}
                      <strong className="text-foreground">
                        {formatChangeValue(change.field, change.newValue)}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AccessDenied() {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
      <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
      <h1 className="mt-4 font-heading text-2xl font-semibold">Brak dostępu</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Katalog produktów jest dostępny tylko dla administratorów.
      </p>
    </div>
  );
}

function buildSaveImpactDescription(
  product: AdminListingProduct,
  next: ListingProductFormValues,
): string {
  const impacts: string[] = [];
  const nextPrice = toUpdateListingProductInput(next).priceGrossAmount;
  if (product.priceGrossAmount !== nextPrice) {
    impacts.push(
      `cena: ${formatListingProductPrice(product.priceGrossAmount, product.currency)} → ${formatListingProductPrice(nextPrice, product.currency)}`,
    );
  }
  if (product.isPublic !== next.isPublic) {
    impacts.push(next.isPublic ? 'produkt stanie się publiczny' : 'produkt zniknie z cennika');
  }
  if (product.isActive !== next.isActive) {
    impacts.push(next.isActive ? 'produkt zostanie aktywowany' : 'produkt zostanie wyłączony');
  }
  return impacts.length > 0
    ? `Skutki zapisu: ${impacts.join('; ')}.`
    : 'Zmiany zostaną zapisane w katalogu i historii audytowej.';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'brak';
  if (field === 'priceGrossAmount' && typeof value === 'number') {
    return formatListingProductPrice(value);
  }
  if (field === 'vatRateBasisPoints' && typeof value === 'number') {
    return `${(value / 100).toLocaleString('pl-PL')}%`;
  }
  if (typeof value === 'boolean') return value ? 'tak' : 'nie';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
