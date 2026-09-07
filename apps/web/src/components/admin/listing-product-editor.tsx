import { Archive, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { ListingProductPreviewCard } from '@/components/listing-products/listing-product-preview-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import {
  LISTING_PRODUCT_TYPE_LABELS,
  ListingProductType,
  type AdminListingProduct,
  type ListingProductFormErrors,
  type ListingProductFormField,
  type ListingProductFormValues,
} from '@/lib/listing-products';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS = Object.values(ListingProductType).map((value) => ({
  value,
  label: LISTING_PRODUCT_TYPE_LABELS[value],
}));

interface ListingProductEditorProps {
  mode: 'create' | 'edit';
  product: AdminListingProduct | null;
  value: ListingProductFormValues;
  errors: ListingProductFormErrors;
  isSaving: boolean;
  actionReason: string;
  isChangingArchiveState: boolean;
  onChange: (value: ListingProductFormValues) => void;
  onSave: () => void;
  onActionReasonChange: (value: string) => void;
  onArchive: () => void;
  onRestore: () => void;
}

export function ListingProductEditor({
  mode,
  product,
  value,
  errors,
  isSaving,
  actionReason,
  isChangingArchiveState,
  onChange,
  onSave,
  onActionReasonChange,
  onArchive,
  onRestore,
}: ListingProductEditorProps) {
  const isArchived = Boolean(product?.archivedAt);

  function setField<K extends ListingProductFormField>(
    field: K,
    nextValue: ListingProductFormValues[K],
  ) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold">
              {mode === 'create' ? 'Nowy produkt' : value.name || value.code}
            </h2>
            {mode === 'edit' ? (
              <Badge variant="outline">{value.code}</Badge>
            ) : null}
            {isArchived ? <Badge variant="destructive">Archiwum</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Nowy produkt domyślnie pozostaje niepubliczny.'
              : 'Kod i typ są niezmienne, aby zachować znaczenie historii zakupów.'}
          </p>
        </div>
        <Button
          type="button"
          className="gap-2 rounded-xl"
          disabled={isSaving || isArchived}
          onClick={onSave}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Zapisywanie…' : mode === 'create' ? 'Utwórz' : 'Zapisz'}
        </Button>
      </div>

      {isArchived ? (
        <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">Produkt zarchiwizowany</p>
            <p className="mt-1 text-muted-foreground">
              Edycja jest zablokowana. Przywrócenie aktywuje produkt, ale nie
              opublikuje go automatycznie.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className={cn('space-y-5', isArchived && 'pointer-events-none opacity-60')}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Kod produktu" error={errors.code}>
              <Input
                value={value.code}
                disabled={mode === 'edit'}
                aria-invalid={Boolean(errors.code)}
                placeholder="np. publikacja_30_dni"
                onChange={(event) =>
                  setField('code', event.target.value.toLowerCase())
                }
              />
            </FormField>
            <FormField label="Typ" error={errors.type}>
              <InlineSelect
                value={value.type}
                options={TYPE_OPTIONS}
                placeholder="Wybierz typ"
                error={Boolean(errors.type)}
                className={mode === 'edit' ? 'pointer-events-none opacity-60' : ''}
                onChange={(nextValue) => {
                  if (mode === 'edit' || !nextValue) return;
                  const type = nextValue as ListingProductType;
                  onChange({
                    ...value,
                    type,
                    featuredTier:
                      type === ListingProductType.FEATURED
                        ? value.featuredTier
                        : '',
                  });
                }}
              />
            </FormField>
            <FormField label="Nazwa dla klienta" error={errors.name}>
              <Input
                value={value.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
            </FormField>
            <FormField label="Cena brutto (PLN)" error={errors.priceGrossPln}>
              <Input
                inputMode="decimal"
                value={value.priceGrossPln}
                aria-invalid={Boolean(errors.priceGrossPln)}
                placeholder="np. 149,00"
                onChange={(event) => setField('priceGrossPln', event.target.value)}
              />
            </FormField>
            <FormField label="Czas działania (dni)" error={errors.durationDays}>
              <Input
                type="number"
                min={1}
                max={3650}
                value={value.durationDays}
                aria-invalid={Boolean(errors.durationDays)}
                onChange={(event) => setField('durationDays', event.target.value)}
              />
            </FormField>
            <FormField
              label="Stawka VAT (%)"
              hint="Pozostaw puste, dopóki decyzja księgowa nie zostanie zatwierdzona."
              error={errors.vatRatePercent}
            >
              <Input
                inputMode="decimal"
                value={value.vatRatePercent}
                aria-invalid={Boolean(errors.vatRatePercent)}
                placeholder="np. 23"
                onChange={(event) => setField('vatRatePercent', event.target.value)}
              />
            </FormField>
            <FormField
              label="Tier wyróżnienia"
              hint="Wymagany wyłącznie dla produktu typu wyróżnienie."
              error={errors.featuredTier}
            >
              <Input
                value={value.featuredTier}
                disabled={value.type !== ListingProductType.FEATURED}
                aria-invalid={Boolean(errors.featuredTier)}
                onChange={(event) => setField('featuredTier', event.target.value)}
              />
            </FormField>
            <FormField
              label="Waga priorytetu"
              hint="Parametr realizacji wyróżnienia; 0 oznacza brak dodatkowego priorytetu."
              error={errors.priorityWeight}
            >
              <Input
                type="number"
                min={0}
                max={1_000_000}
                value={value.priorityWeight}
                aria-invalid={Boolean(errors.priorityWeight)}
                onChange={(event) => setField('priorityWeight', event.target.value)}
              />
            </FormField>
            <FormField label="Kolejność w cenniku" error={errors.sortOrder}>
              <Input
                type="number"
                min={0}
                max={1_000_000}
                value={value.sortOrder}
                aria-invalid={Boolean(errors.sortOrder)}
                onChange={(event) => setField('sortOrder', event.target.value)}
              />
            </FormField>
            <FormField
              label="Referencja ceny operatora"
              hint="Pole wewnętrzne — nigdy nie jest zwracane w publicznym API."
              error={errors.providerPriceReference}
            >
              <Input
                value={value.providerPriceReference}
                aria-invalid={Boolean(errors.providerPriceReference)}
                onChange={(event) =>
                  setField('providerPriceReference', event.target.value)
                }
              />
            </FormField>
          </div>

          <FormField label="Opis dla klienta" error={errors.description}>
            <textarea
              rows={4}
              value={value.description}
              aria-invalid={Boolean(errors.description)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 aria-invalid:border-destructive"
              onChange={(event) => setField('description', event.target.value)}
            />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <BooleanField
              checked={value.isActive}
              label="Aktywny"
              description="Może zostać użyty w nowych procesach sprzedażowych."
              onChange={(checked) =>
                onChange({
                  ...value,
                  isActive: checked,
                  isPublic: checked ? value.isPublic : false,
                })
              }
            />
            <BooleanField
              checked={value.isPublic}
              disabled={!value.isActive}
              label="Widoczny publicznie"
              description="Pojawi się w publicznym katalogu po włączeniu flagi wydania."
              error={errors.isPublic}
              onChange={(checked) => setField('isPublic', checked)}
            />
          </div>

          <FormField
            label="Powód zmiany (opcjonalnie)"
            hint="Trafi do historii audytowej razem ze zmianami pól."
            error={errors.reason}
          >
            <Input
              value={value.reason}
              aria-invalid={Boolean(errors.reason)}
              placeholder="np. aktualizacja cennika na IV kwartał"
              onChange={(event) => setField('reason', event.target.value)}
            />
          </FormField>
        </div>

        <aside>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Podgląd publicznej karty
          </p>
          <ListingProductPreviewCard
            draft={value}
            isVisible={value.isPublic && value.isActive && !isArchived}
          />
        </aside>
      </div>

      {mode === 'edit' && product ? (
        <section className="rounded-2xl border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">Cykl życia produktu</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Podaj obowiązkowy powód. Produktów nie usuwamy trwale ze względu na
            historię zamówień.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Input
              value={actionReason}
              maxLength={1_000}
              placeholder={isArchived ? 'Powód przywrócenia' : 'Powód archiwizacji'}
              aria-label={isArchived ? 'Powód przywrócenia' : 'Powód archiwizacji'}
              onChange={(event) => onActionReasonChange(event.target.value)}
            />
            <Button
              type="button"
              variant={isArchived ? 'outline' : 'destructive'}
              className="shrink-0 gap-2 rounded-xl"
              disabled={isChangingArchiveState}
              onClick={isArchived ? onRestore : onArchive}
            >
              {isArchived ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {isChangingArchiveState
                ? 'Zapisywanie…'
                : isArchived
                  ? 'Przywróć'
                  : 'Archiwizuj'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function BooleanField({
  checked,
  disabled,
  label,
  description,
  error,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  error?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
        {error ? (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        ) : null}
      </span>
    </label>
  );
}
