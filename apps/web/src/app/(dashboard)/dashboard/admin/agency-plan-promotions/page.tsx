'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgePercent,
  CheckCircle2,
  Info,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  AGENCY_PLAN_BILLING_INTERVAL_LABELS,
  AGENCY_PLAN_BILLING_INTERVAL_OPTIONS,
  AGENCY_PLAN_LABELS,
  AGENCY_PLAN_OPTIONS,
  AGENCY_PLAN_PROMOTION_APPLICATION_TIMING_LABELS,
  AGENCY_PLAN_PROMOTION_DISCOUNT_TYPE_LABELS,
  AGENCY_PLAN_PROMOTION_STATUS_LABELS,
  AGENCY_PLAN_PROMOTION_TARGET_SCOPE_LABELS,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
  archiveAdminAgencyPlanPromotionCampaign,
  createAdminAgencyPlanPromotionCampaign,
  createAdminAgencyPlanPromotionCode,
  createEmptyAgencyPlanPromotionCampaignForm,
  createEmptyAgencyPlanPromotionCodeForm,
  fetchAdminAgencyPlanPromotions,
  restoreAdminAgencyPlanPromotionCampaign,
  toAgencyPlanPromotionCampaignForm,
  toCreateAgencyPlanPromotionCampaignInput,
  toCreateAgencyPlanPromotionCodeInput,
  toUpdateAgencyPlanPromotionCampaignInput,
  updateAdminAgencyPlanPromotionCampaign,
  validateAgencyPlanPromotionCampaignForm,
  validateAgencyPlanPromotionCodeForm,
  type AdminAgencyPlanPromotionCampaign,
  type AgencyPlanPromotionCampaignFormErrors,
  type AgencyPlanPromotionCampaignFormField,
  type AgencyPlanPromotionCampaignFormValues,
  type AgencyPlanPromotionCodeFormErrors,
  type AgencyPlanPromotionCodeFormField,
  type AgencyPlanPromotionCodeFormValues,
} from '@/lib/agency-plan-promotions';
import { formatPlanMoney } from '@/lib/public-pricing';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = Object.values(AgencyPlanPromotionStatus).map((value) => ({
  value,
  label: AGENCY_PLAN_PROMOTION_STATUS_LABELS[value],
}));

const EDITABLE_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (option) => option.value !== AgencyPlanPromotionStatus.ARCHIVED,
);

const DISCOUNT_TYPE_OPTIONS = Object.values(AgencyPlanPromotionDiscountType).map(
  (value) => ({ value, label: AGENCY_PLAN_PROMOTION_DISCOUNT_TYPE_LABELS[value] }),
);

const CODE_DISCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Dziedzicz z kampanii' },
  ...DISCOUNT_TYPE_OPTIONS,
];

const TARGET_SCOPE_OPTIONS = Object.values(AgencyPlanPromotionTargetScope).map(
  (value) => ({ value, label: AGENCY_PLAN_PROMOTION_TARGET_SCOPE_LABELS[value] }),
);

const APPLICATION_TIMING_OPTIONS = Object.values(
  AgencyPlanPromotionApplicationTiming,
).map((value) => ({
  value,
  label: AGENCY_PLAN_PROMOTION_APPLICATION_TIMING_LABELS[value],
}));

const CODE_APPLICATION_TIMING_OPTIONS = [
  { value: '', label: 'Dziedzicz z kampanii' },
  ...APPLICATION_TIMING_OPTIONS,
];

type FilterStatus = 'all' | AgencyPlanPromotionStatus;
type EditorMode = 'create' | 'edit';

export default function AdminAgencyPlanPromotionsPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [campaigns, setCampaigns] = useState<
    AdminAgencyPlanPromotionCampaign[]
  >([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [form, setForm] = useState<AgencyPlanPromotionCampaignFormValues>(
    createEmptyAgencyPlanPromotionCampaignForm,
  );
  const [codeForm, setCodeForm] = useState<AgencyPlanPromotionCodeFormValues>(
    createEmptyAgencyPlanPromotionCodeForm,
  );
  const [errors, setErrors] = useState<AgencyPlanPromotionCampaignFormErrors>(
    {},
  );
  const [codeErrors, setCodeErrors] =
    useState<AgencyPlanPromotionCodeFormErrors>({});
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isChangingArchiveState, setIsChangingArchiveState] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = user?.role === 'admin';

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.code === selectedCode) ?? null,
    [campaigns, selectedCode],
  );

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesStatus =
        statusFilter === 'all' || campaign.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        campaign.code.includes(normalizedQuery) ||
        campaign.name.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [campaigns, query, statusFilter]);

  const selectCampaign = useCallback(
    (campaign: AdminAgencyPlanPromotionCampaign) => {
      setMode('edit');
      setSelectedCode(campaign.code);
      setForm(toAgencyPlanPromotionCampaignForm(campaign));
      setCodeForm(createEmptyAgencyPlanPromotionCodeForm());
      setErrors({});
      setCodeErrors({});
    },
    [],
  );

  const startCreating = useCallback(() => {
    setMode('create');
    setSelectedCode(null);
    setForm(createEmptyAgencyPlanPromotionCampaignForm());
    setCodeForm(createEmptyAgencyPlanPromotionCodeForm());
    setErrors({});
    setCodeErrors({});
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);
    fetchAdminAgencyPlanPromotions()
      .then((response) => {
        if (!isMounted) return;
        setCampaigns(response);
        const nextCampaign =
          response.find((campaign) => campaign.code === selectedCode) ??
          response[0];
        if (nextCampaign) selectCampaign(nextCampaign);
        else startCreating();
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
    // Manual refresh intentionally re-synchronizes the current editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, refreshToken, selectCampaign, startCreating]);

  if (!isAdmin) return <AccessDenied />;

  function replaceCampaign(updated: AdminAgencyPlanPromotionCampaign) {
    setCampaigns((current) =>
      [
        ...current.filter((campaign) => campaign.code !== updated.code),
        updated,
      ].sort(sortCampaigns),
    );
    selectCampaign(updated);
  }

  async function saveCampaign() {
    const validation = validateAgencyPlanPromotionCampaignForm(form);
    setErrors(validation.errors);
    if (!validation.data) {
      showErrorToast({
        title: 'Sprawdź formularz',
        description: 'Niektóre pola kampanii wymagają poprawy.',
      });
      return;
    }

    if (mode === 'edit' && !selectedCampaign) return;
    const confirmed = await confirm({
      title:
        mode === 'create'
          ? 'Utworzyć promocję planów?'
          : 'Zapisać zmiany promocji?',
      description: buildCampaignSaveImpact(validation.data, mode),
      confirmLabel: mode === 'create' ? 'Utwórz kampanię' : 'Zapisz zmiany',
      variant:
        validation.data.status === AgencyPlanPromotionStatus.ACTIVE
          ? 'destructive'
          : 'default',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const updated =
        mode === 'create'
          ? await createAdminAgencyPlanPromotionCampaign(
              toCreateAgencyPlanPromotionCampaignInput(validation.data),
            )
          : await updateAdminAgencyPlanPromotionCampaign(
              selectedCampaign!.code,
              toUpdateAgencyPlanPromotionCampaignInput(validation.data),
            );
      replaceCampaign(updated);
      showSuccessToast({
        title:
          mode === 'create' ? 'Kampania utworzona' : 'Kampania zaktualizowana',
        description: updated.name,
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać kampanii',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function changeArchiveState(action: 'archive' | 'restore') {
    if (!selectedCampaign) return;
    const isArchive = action === 'archive';
    const confirmed = await confirm({
      title: isArchive ? 'Zarchiwizować kampanię?' : 'Przywrócić kampanię?',
      description: isArchive
        ? 'Kampania przestanie wpływać na nowe wyceny planów. Historia użyć pozostanie zachowana.'
        : 'Kampania wróci jako wstrzymana. Aktywację wykonaj osobnym zapisem formularza.',
      confirmLabel: isArchive ? 'Archiwizuj' : 'Przywróć',
      variant: isArchive ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    setIsChangingArchiveState(true);
    try {
      const updated = isArchive
        ? await archiveAdminAgencyPlanPromotionCampaign(selectedCampaign.code)
        : await restoreAdminAgencyPlanPromotionCampaign(selectedCampaign.code);
      replaceCampaign(updated);
      showSuccessToast({
        title: isArchive ? 'Kampania zarchiwizowana' : 'Kampania przywrócona',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zmienić statusu kampanii',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsChangingArchiveState(false);
    }
  }

  async function saveCode() {
    if (!selectedCampaign) return;
    const validation = validateAgencyPlanPromotionCodeForm(codeForm);
    setCodeErrors(validation.errors);
    if (!validation.data) {
      showErrorToast({
        title: 'Sprawdź kod',
        description: 'Niektóre pola kodu promocyjnego wymagają poprawy.',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Utworzyć kod promocyjny?',
      description:
        'Po zapisie aplikacja pokaże tylko końcówkę kodu. Pełnej wartości nie będzie można odczytać z panelu.',
      confirmLabel: 'Utwórz kod',
      variant:
        validation.data.status === AgencyPlanPromotionStatus.ACTIVE
          ? 'destructive'
          : 'default',
    });
    if (!confirmed) return;

    setIsSavingCode(true);
    try {
      const updated = await createAdminAgencyPlanPromotionCode(
        selectedCampaign.code,
        toCreateAgencyPlanPromotionCodeInput(validation.data),
      );
      replaceCampaign(updated);
      setCodeForm(createEmptyAgencyPlanPromotionCodeForm());
      setCodeErrors({});
      showSuccessToast({ title: 'Kod promocyjny utworzony' });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się utworzyć kodu',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSavingCode(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">
              Promocje planów agentów
            </h1>
            <Badge variant="outline">{campaigns.length} kampanii</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Kampanie automatyczne i kody promocyjne dla abonamentów agentów i
            biur. Publiczny cennik pokazuje tylko aktywne promocje
            automatyczne dla zakupu planu.
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
          <Button
            type="button"
            className="gap-2 rounded-xl"
            onClick={startCreating}
          >
            <Plus className="h-4 w-4" />
            Nowa kampania
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Nie udało się pobrać promocji.</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-border bg-card p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BadgePercent className="h-4 w-4 text-primary" />
            Kampanie
          </div>
          <div className="mb-3 grid gap-2">
            <Input
              value={query}
              placeholder="Szukaj po nazwie lub kodzie"
              onChange={(event) => setQuery(event.target.value)}
            />
            <InlineSelect
              value={statusFilter}
              placeholder="Status"
              options={[
                { value: 'all', label: 'Wszystkie statusy' },
                ...STATUS_OPTIONS,
              ]}
              onChange={(value) =>
                setStatusFilter((value ?? 'all') as FilterStatus)
              }
            />
          </div>
          {isLoading && campaigns.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
              Brak kampanii dla wybranych filtrów.
            </p>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {filteredCampaigns.map((campaign) => (
                <button
                  key={campaign.code}
                  type="button"
                  onClick={() => selectCampaign(campaign)}
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    mode === 'edit' && selectedCode === campaign.code
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {campaign.name}
                    </span>
                    <PromotionStatusBadge status={campaign.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {campaign.code}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CampaignApplicationBadge campaign={campaign} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDiscount(campaign)}</span>
                    <strong className="text-foreground">
                      {campaign.usageCount}
                      {campaign.usageLimitTotal
                        ? `/${campaign.usageLimitTotal}`
                        : ''}{' '}
                      użyć
                    </strong>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <CampaignEditor
              mode={mode}
              campaign={selectedCampaign}
              value={form}
              errors={errors}
              isSaving={isSaving}
              isChangingArchiveState={isChangingArchiveState}
              onChange={setForm}
              onSave={saveCampaign}
              onArchive={() => void changeArchiveState('archive')}
              onRestore={() => void changeArchiveState('restore')}
            />
          </section>

          {mode === 'edit' && selectedCampaign ? (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
              <PromotionCodesPanel
                campaign={selectedCampaign}
                value={codeForm}
                errors={codeErrors}
                isSaving={isSavingCode}
                onChange={setCodeForm}
                onSave={saveCode}
              />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function CampaignEditor({
  mode,
  campaign,
  value,
  errors,
  isSaving,
  isChangingArchiveState,
  onChange,
  onSave,
  onArchive,
  onRestore,
}: {
  mode: EditorMode;
  campaign: AdminAgencyPlanPromotionCampaign | null;
  value: AgencyPlanPromotionCampaignFormValues;
  errors: AgencyPlanPromotionCampaignFormErrors;
  isSaving: boolean;
  isChangingArchiveState: boolean;
  onChange: (value: AgencyPlanPromotionCampaignFormValues) => void;
  onSave: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const isArchived = campaign?.status === AgencyPlanPromotionStatus.ARCHIVED;

  function setField<K extends AgencyPlanPromotionCampaignFormField>(
    field: K,
    nextValue: AgencyPlanPromotionCampaignFormValues[K],
  ) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold">
              {mode === 'create' ? 'Nowa kampania' : value.name || value.code}
            </h2>
            {mode === 'edit' ? <Badge variant="outline">{value.code}</Badge> : null}
            {isArchived ? <Badge variant="destructive">Archiwum</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Kampania automatyczna wpływa na publiczny cennik agentów. Kody
            promocyjne działają po wpisaniu kodu przy zakupie lub przy kolejnych
            płatnościach, zależnie od ustawionego momentu zastosowania.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === 'edit' && campaign ? (
            campaign.archivedAt ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl"
                disabled={isChangingArchiveState}
                onClick={onRestore}
              >
                <RotateCcw className="h-4 w-4" />
                Przywróć
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl"
                disabled={isChangingArchiveState}
                onClick={onArchive}
              >
                <Archive className="h-4 w-4" />
                Archiwizuj
              </Button>
            )
          ) : null}
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
      </div>

      <CampaignActivationNotice campaign={campaign} value={value} />

      <div className={cn('space-y-5', isArchived && 'pointer-events-none opacity-60')}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Kod kampanii" error={errors.code}>
            <Input
              value={value.code}
              disabled={mode === 'edit'}
              aria-invalid={Boolean(errors.code)}
              placeholder="np. start_agents"
              onChange={(event) => setField('code', event.target.value)}
            />
          </FormField>
          <FormField label="Status" error={errors.status}>
            <InlineSelect
              value={value.status}
              placeholder="Wybierz status"
              options={EDITABLE_STATUS_OPTIONS}
              error={Boolean(errors.status)}
              onChange={(nextValue) =>
                nextValue &&
                setField('status', nextValue as AgencyPlanPromotionStatus)
              }
            />
          </FormField>
          <FormField label="Nazwa" error={errors.name}>
            <Input
              value={value.name}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => setField('name', event.target.value)}
            />
          </FormField>
          <FormField label="Typ rabatu" error={errors.discountType}>
            <InlineSelect
              value={value.discountType}
              placeholder="Wybierz typ rabatu"
              options={DISCOUNT_TYPE_OPTIONS}
              error={Boolean(errors.discountType)}
              onChange={(nextValue) =>
                nextValue &&
                setField(
                  'discountType',
                  nextValue as AgencyPlanPromotionDiscountType,
                )
              }
            />
          </FormField>
          <DiscountValueFields
            discountType={value.discountType}
            discountPercent={value.discountPercent}
            discountGrossPln={value.discountGrossPln}
            errors={{
              discountPercent: errors.discountPercent,
              discountGrossPln: errors.discountGrossPln,
            }}
            onPercentChange={(nextValue) =>
              setField('discountPercent', nextValue)
            }
            onGrossChange={(nextValue) => setField('discountGrossPln', nextValue)}
          />
          <FormField
            label="Maksymalny rabat brutto"
            hint="Opcjonalny cap dla rabatu procentowego."
            error={errors.maxDiscountGrossPln}
          >
            <Input
              inputMode="decimal"
              value={value.maxDiscountGrossPln}
              aria-invalid={Boolean(errors.maxDiscountGrossPln)}
              placeholder="np. 20,00"
              onChange={(event) =>
                setField('maxDiscountGrossPln', event.target.value)
              }
            />
          </FormField>
          <FormField label="Zakres planów" error={errors.targetScope}>
            <InlineSelect
              value={value.targetScope}
              placeholder="Wybierz zakres"
              options={TARGET_SCOPE_OPTIONS}
              error={Boolean(errors.targetScope)}
              onChange={(nextValue) =>
                nextValue &&
                setField(
                  'targetScope',
                  nextValue as AgencyPlanPromotionTargetScope,
                )
              }
            />
          </FormField>
          <FormField label="Moment zastosowania" error={errors.applicationTiming}>
            <InlineSelect
              value={value.applicationTiming}
              placeholder="Moment zastosowania"
              options={APPLICATION_TIMING_OPTIONS}
              error={Boolean(errors.applicationTiming)}
              onChange={(nextValue) =>
                nextValue &&
                setField(
                  'applicationTiming',
                  nextValue as AgencyPlanPromotionApplicationTiming,
                )
              }
            />
          </FormField>
          <FormField
            label="Liczba okresów rozliczeniowych"
            hint="Np. 1 = pierwszy miesiąc/rok, 3 = pierwsze 3 płatności."
            error={errors.durationBillingCycles}
          >
            <Input
              type="number"
              min={1}
              max={120}
              value={value.durationBillingCycles}
              aria-invalid={Boolean(errors.durationBillingCycles)}
              onChange={(event) =>
                setField('durationBillingCycles', event.target.value)
              }
            />
          </FormField>
          <FormField
            label="Minimalna wartość planu"
            error={errors.minimumSubtotalGrossPln}
          >
            <Input
              inputMode="decimal"
              value={value.minimumSubtotalGrossPln}
              aria-invalid={Boolean(errors.minimumSubtotalGrossPln)}
              placeholder="np. 199,00"
              onChange={(event) =>
                setField('minimumSubtotalGrossPln', event.target.value)
              }
            />
          </FormField>
        </div>

        <TargetRulesEditor value={value} errors={errors} onChange={onChange} />

        <FormField label="Opis" error={errors.description}>
          <textarea
            rows={3}
            value={value.description}
            aria-invalid={Boolean(errors.description)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 aria-invalid:border-destructive"
            onChange={(event) => setField('description', event.target.value)}
          />
        </FormField>

        <div className="grid gap-3 md:grid-cols-2">
          <BooleanField
            checked={value.isAutomatic}
            label="Promocja automatyczna"
            description="Pokazuje się w publicznym cenniku planów, jeśli dotyczy zakupu planu."
            onChange={(checked) => setField('isAutomatic', checked)}
          />
          <BooleanField
            checked={value.isCombinable}
            label="Można łączyć"
            description="Pozwala połączyć rabat z innymi rabatami łączonymi."
            onChange={(checked) => setField('isCombinable', checked)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Limit użyć globalnie" error={errors.usageLimitTotal}>
            <Input
              type="number"
              min={1}
              value={value.usageLimitTotal}
              aria-invalid={Boolean(errors.usageLimitTotal)}
              onChange={(event) =>
                setField('usageLimitTotal', event.target.value)
              }
            />
          </FormField>
          <FormField
            label="Limit użyć na konto"
            error={errors.usageLimitPerAccount}
          >
            <Input
              type="number"
              min={1}
              value={value.usageLimitPerAccount}
              aria-invalid={Boolean(errors.usageLimitPerAccount)}
              onChange={(event) =>
                setField('usageLimitPerAccount', event.target.value)
              }
            />
          </FormField>
          <FormField label="Start" error={errors.startsAt}>
            <Input
              type="datetime-local"
              value={value.startsAt}
              aria-invalid={Boolean(errors.startsAt)}
              onChange={(event) => setField('startsAt', event.target.value)}
            />
          </FormField>
          <FormField label="Koniec" error={errors.endsAt}>
            <Input
              type="datetime-local"
              value={value.endsAt}
              aria-invalid={Boolean(errors.endsAt)}
              onChange={(event) => setField('endsAt', event.target.value)}
            />
          </FormField>
        </div>

        {campaign ? <CampaignStats campaign={campaign} /> : null}
      </div>
    </div>
  );
}

function CampaignActivationNotice({
  campaign,
  value,
}: {
  campaign: AdminAgencyPlanPromotionCampaign | null;
  value: AgencyPlanPromotionCampaignFormValues;
}) {
  const hasCodes = Boolean(campaign?.codes.length);
  const isActive = value.status === AgencyPlanPromotionStatus.ACTIVE;

  if (!isActive) {
    return (
      <AdminNotice
        tone="neutral"
        icon={Info}
        title="Kampania nie jest aktywna"
        description="Nie wpłynie na publiczny cennik ani na wyceny planów, dopóki nie zmienisz statusu na aktywny."
      />
    );
  }

  if (
    value.isAutomatic &&
    value.applicationTiming ===
      AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT
  ) {
    return (
      <AdminNotice
        tone="success"
        icon={CheckCircle2}
        title="Promocja pokaże się w cenniku"
        description="Jeśli plan, okres rozliczenia, daty i limity są spełnione, rabat pokaże się w publicznym cenniku agentów i będzie gotowy do wyceny zakupu planu."
      />
    );
  }

  if (value.isAutomatic) {
    return (
      <AdminNotice
        tone="warning"
        icon={AlertTriangle}
        title="Automatyczna promocja nie jest promocją startową"
        description="Publiczny cennik pokazuje tylko promocje automatyczne dla zakupu planu. Ten wariant może działać później dla kolejnych płatności."
      />
    );
  }

  if (hasCodes) {
    return (
      <AdminNotice
        tone="neutral"
        icon={Info}
        title="Promocja działa po kodzie"
        description="Rabat nie pokaże się automatycznie w publicznym cenniku. Użytkownik lub admin użyje go jako kodu promocyjnego."
      />
    );
  }

  return (
    <AdminNotice
      tone="warning"
      icon={AlertTriangle}
      title="Aktywna kampania nie zostanie zastosowana"
      description="Zaznacz promocję automatyczną albo dodaj kody promocyjne. Sama aktywna kampania bez tych ustawień nie obniży żadnej ceny."
    />
  );
}

function AdminNotice({
  tone,
  icon: Icon,
  title,
  description,
}: {
  tone: 'neutral' | 'success' | 'warning';
  icon: typeof Info;
  title: string;
  description: string;
}) {
  const className = {
    neutral: 'border-border bg-muted/40 text-muted-foreground',
    success:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning:
      'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  }[tone];

  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{description}</p>
      </div>
    </div>
  );
}

function PromotionCodesPanel({
  campaign,
  value,
  errors,
  isSaving,
  onChange,
  onSave,
}: {
  campaign: AdminAgencyPlanPromotionCampaign;
  value: AgencyPlanPromotionCodeFormValues;
  errors: AgencyPlanPromotionCodeFormErrors;
  isSaving: boolean;
  onChange: (value: AgencyPlanPromotionCodeFormValues) => void;
  onSave: () => void;
}) {
  function setField<K extends AgencyPlanPromotionCodeFormField>(
    field: K,
    nextValue: AgencyPlanPromotionCodeFormValues[K],
  ) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-xl font-semibold">
            Kody promocyjne
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pełny kod jest widoczny tylko przed zapisem. Później panel pokazuje
          wyłącznie ostatnie znaki i statystyki.
        </p>
      </div>

      <div className="grid gap-2">
        {campaign.codes.length ? (
          campaign.codes.map((code) => (
            <div
              key={code.id}
              className="rounded-xl border border-border bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{code.label}</p>
                  <p className="text-xs text-muted-foreground">
                    końcówka: {code.codeLast4 ?? 'brak'} ·{' '}
                    {formatNullableDiscount(code, campaign)} ·{' '}
                    {formatCodeDuration(code, campaign)}
                  </p>
                </div>
                <PromotionStatusBadge status={code.status} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {code.usageCount}
                {code.usageLimitTotal ? `/${code.usageLimitTotal}` : ''} użyć
                globalnie
                {code.usageLimitPerAccount
                  ? ` · limit ${code.usageLimitPerAccount} / konto`
                  : ''}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Ta kampania nie ma jeszcze kodów.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <h3 className="font-semibold">Nowy kod</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Kod" error={errors.code}>
            <Input
              value={value.code}
              aria-invalid={Boolean(errors.code)}
              placeholder="np. AGENT50"
              autoComplete="off"
              onChange={(event) => setField('code', event.target.value)}
            />
          </FormField>
          <FormField label="Etykieta" error={errors.label}>
            <Input
              value={value.label}
              aria-invalid={Boolean(errors.label)}
              placeholder="np. Kod AGENT50"
              onChange={(event) => setField('label', event.target.value)}
            />
          </FormField>
          <FormField label="Status" error={errors.status}>
            <InlineSelect
              value={value.status}
              placeholder="Wybierz status"
              options={EDITABLE_STATUS_OPTIONS}
              error={Boolean(errors.status)}
              onChange={(nextValue) =>
                nextValue &&
                setField('status', nextValue as AgencyPlanPromotionStatus)
              }
            />
          </FormField>
          <FormField label="Nadpisanie rabatu" error={errors.discountType}>
            <InlineSelect
              value={value.discountType}
              placeholder="Wybierz rabat"
              options={CODE_DISCOUNT_TYPE_OPTIONS}
              error={Boolean(errors.discountType)}
              onChange={(nextValue) =>
                setField(
                  'discountType',
                  (nextValue ?? '') as AgencyPlanPromotionCodeFormValues['discountType'],
                )
              }
            />
          </FormField>
          {value.discountType ? (
            <DiscountValueFields
              discountType={value.discountType}
              discountPercent={value.discountPercent}
              discountGrossPln={value.discountGrossPln}
              errors={{
                discountPercent: errors.discountPercent,
                discountGrossPln: errors.discountGrossPln,
              }}
              onPercentChange={(nextValue) =>
                setField('discountPercent', nextValue)
              }
              onGrossChange={(nextValue) =>
                setField('discountGrossPln', nextValue)
              }
            />
          ) : null}
          <FormField
            label="Maksymalny rabat brutto"
            error={errors.maxDiscountGrossPln}
          >
            <Input
              inputMode="decimal"
              value={value.maxDiscountGrossPln}
              aria-invalid={Boolean(errors.maxDiscountGrossPln)}
              onChange={(event) =>
                setField('maxDiscountGrossPln', event.target.value)
              }
            />
          </FormField>
          <FormField
            label="Liczba okresów"
            hint="Puste pole oznacza dziedziczenie z kampanii."
            error={errors.durationBillingCycles}
          >
            <Input
              type="number"
              min={1}
              max={120}
              value={value.durationBillingCycles}
              aria-invalid={Boolean(errors.durationBillingCycles)}
              onChange={(event) =>
                setField('durationBillingCycles', event.target.value)
              }
            />
          </FormField>
          <FormField label="Moment zastosowania" error={errors.applicationTiming}>
            <InlineSelect
              value={value.applicationTiming}
              placeholder="Moment zastosowania"
              options={CODE_APPLICATION_TIMING_OPTIONS}
              error={Boolean(errors.applicationTiming)}
              onChange={(nextValue) =>
                setField(
                  'applicationTiming',
                  (nextValue ?? '') as AgencyPlanPromotionCodeFormValues['applicationTiming'],
                )
              }
            />
          </FormField>
          <FormField label="Łączenie rabatu" error={errors.isCombinable}>
            <InlineSelect
              value={value.isCombinable}
              placeholder="Łączenie rabatu"
              options={[
                { value: 'inherit', label: 'Dziedzicz z kampanii' },
                { value: 'true', label: 'Można łączyć' },
                { value: 'false', label: 'Nie można łączyć' },
              ]}
              error={Boolean(errors.isCombinable)}
              onChange={(nextValue) =>
                setField(
                  'isCombinable',
                  (nextValue ?? 'inherit') as AgencyPlanPromotionCodeFormValues['isCombinable'],
                )
              }
            />
          </FormField>
          <FormField label="Limit użyć globalnie" error={errors.usageLimitTotal}>
            <Input
              type="number"
              min={1}
              value={value.usageLimitTotal}
              aria-invalid={Boolean(errors.usageLimitTotal)}
              onChange={(event) =>
                setField('usageLimitTotal', event.target.value)
              }
            />
          </FormField>
          <FormField
            label="Limit użyć na konto"
            error={errors.usageLimitPerAccount}
          >
            <Input
              type="number"
              min={1}
              value={value.usageLimitPerAccount}
              aria-invalid={Boolean(errors.usageLimitPerAccount)}
              onChange={(event) =>
                setField('usageLimitPerAccount', event.target.value)
              }
            />
          </FormField>
          <FormField label="Start" error={errors.startsAt}>
            <Input
              type="datetime-local"
              value={value.startsAt}
              aria-invalid={Boolean(errors.startsAt)}
              onChange={(event) => setField('startsAt', event.target.value)}
            />
          </FormField>
          <FormField label="Koniec" error={errors.endsAt}>
            <Input
              type="datetime-local"
              value={value.endsAt}
              aria-invalid={Boolean(errors.endsAt)}
              onChange={(event) => setField('endsAt', event.target.value)}
            />
          </FormField>
        </div>
        <Button
          type="button"
          className="mt-4 gap-2 rounded-xl"
          disabled={isSaving}
          onClick={onSave}
        >
          <KeyRound className="h-4 w-4" />
          {isSaving ? 'Tworzenie…' : 'Utwórz kod'}
        </Button>
      </div>
    </div>
  );
}

function DiscountValueFields({
  discountType,
  discountPercent,
  discountGrossPln,
  errors,
  onPercentChange,
  onGrossChange,
}: {
  discountType: AgencyPlanPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  errors: { discountPercent?: string; discountGrossPln?: string };
  onPercentChange: (value: string) => void;
  onGrossChange: (value: string) => void;
}) {
  return discountType === AgencyPlanPromotionDiscountType.PERCENTAGE ? (
    <FormField label="Rabat (%)" error={errors.discountPercent}>
      <Input
        inputMode="decimal"
        value={discountPercent}
        aria-invalid={Boolean(errors.discountPercent)}
        placeholder="np. 10"
        onChange={(event) => onPercentChange(event.target.value)}
      />
    </FormField>
  ) : (
    <FormField label="Rabat kwotowy brutto" error={errors.discountGrossPln}>
      <Input
        inputMode="decimal"
        value={discountGrossPln}
        aria-invalid={Boolean(errors.discountGrossPln)}
        placeholder="np. 20,00"
        onChange={(event) => onGrossChange(event.target.value)}
      />
    </FormField>
  );
}

function TargetRulesEditor({
  value,
  errors,
  onChange,
}: {
  value: AgencyPlanPromotionCampaignFormValues;
  errors: AgencyPlanPromotionCampaignFormErrors;
  onChange: (value: AgencyPlanPromotionCampaignFormValues) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormField
        label={
          value.targetScope === AgencyPlanPromotionTargetScope.PLAN_CODES
            ? 'Plany objęte promocją'
            : 'Opcjonalne ograniczenie do planów'
        }
        error={errors.planCodes}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENCY_PLAN_OPTIONS.map((planCode) => (
            <BooleanField
              key={planCode}
              checked={value.planCodes.includes(planCode)}
              label={AGENCY_PLAN_LABELS[planCode]}
              description=""
              onChange={(checked) => {
                const planCodes = checked
                  ? [...value.planCodes, planCode]
                  : value.planCodes.filter((item) => item !== planCode);
                onChange({ ...value, planCodes });
              }}
            />
          ))}
        </div>
      </FormField>
      <FormField
        label={
          value.targetScope === AgencyPlanPromotionTargetScope.BILLING_INTERVALS
            ? 'Okresy rozliczenia objęte promocją'
            : 'Opcjonalne ograniczenie do okresów'
        }
        error={errors.billingIntervals}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENCY_PLAN_BILLING_INTERVAL_OPTIONS.map((interval) => (
            <BooleanField
              key={interval}
              checked={value.billingIntervals.includes(interval)}
              label={AGENCY_PLAN_BILLING_INTERVAL_LABELS[interval]}
              description=""
              onChange={(checked) => {
                const billingIntervals = checked
                  ? [...value.billingIntervals, interval]
                  : value.billingIntervals.filter((item) => item !== interval);
                onChange({ ...value, billingIntervals });
              }}
            />
          ))}
        </div>
      </FormField>
    </div>
  );
}

function CampaignStats({
  campaign,
}: {
  campaign: AdminAgencyPlanPromotionCampaign;
}) {
  const codeUsage = campaign.codes.reduce(
    (sum, code) => sum + code.usageCount,
    0,
  );
  return (
    <div className="grid gap-3 rounded-2xl bg-muted/40 p-4 text-sm sm:grid-cols-3">
      <Stat label="Użycia kampanii" value={String(campaign.usageCount)} />
      <Stat label="Użycia kodów" value={String(codeUsage)} />
      <Stat label="Liczba kodów" value={String(campaign.codes.length)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function BooleanField({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
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
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function PromotionStatusBadge({
  status,
}: {
  status: AgencyPlanPromotionStatus;
}) {
  const variant =
    status === AgencyPlanPromotionStatus.ACTIVE
      ? 'default'
      : status === AgencyPlanPromotionStatus.ARCHIVED
        ? 'destructive'
        : 'outline';
  return (
    <Badge variant={variant}>
      {AGENCY_PLAN_PROMOTION_STATUS_LABELS[status]}
    </Badge>
  );
}

function CampaignApplicationBadge({
  campaign,
}: {
  campaign: AdminAgencyPlanPromotionCampaign;
}) {
  if (campaign.status !== AgencyPlanPromotionStatus.ACTIVE) {
    return <Badge variant="outline">Nie wpływa na ceny</Badge>;
  }

  if (
    campaign.isAutomatic &&
    campaign.applicationTiming ===
      AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT
  ) {
    return <Badge variant="gold">Automatycznie w cenniku</Badge>;
  }

  if (campaign.isAutomatic) {
    return <Badge variant="outline">Automatycznie poza cennikiem</Badge>;
  }

  if (campaign.codes.length > 0) {
    return <Badge variant="outline">Działa po kodzie</Badge>;
  }

  return <Badge variant="destructive">Brak automatyzacji i kodów</Badge>;
}

function AccessDenied() {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h1 className="font-heading text-xl font-semibold text-destructive">
        Brak dostępu
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ten widok jest dostępny tylko dla administratorów.
      </p>
    </div>
  );
}

function buildCampaignSaveImpact(
  values: AgencyPlanPromotionCampaignFormValues,
  mode: EditorMode,
): string {
  const prefix =
    mode === 'create'
      ? `Kampania „${values.name}” zostanie utworzona`
      : `Kampania „${values.name}” zostanie zaktualizowana`;
  const status =
    values.status === AgencyPlanPromotionStatus.ACTIVE
      ? ' jako aktywna i zacznie wpływać na nowe wyceny planów.'
      : ` ze statusem „${AGENCY_PLAN_PROMOTION_STATUS_LABELS[values.status]}”.`;
  return `${prefix}${status}`;
}

function formatDiscount(campaign: AdminAgencyPlanPromotionCampaign): string {
  return campaign.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
    ? `${formatBasisPoints(campaign.discountValue)}%`
    : formatPlanMoney(campaign.discountValue);
}

function formatNullableDiscount(
  code: AdminAgencyPlanPromotionCampaign['codes'][number],
  campaign: AdminAgencyPlanPromotionCampaign,
): string {
  if (!code.discountType || code.discountValue === null) {
    return `dziedziczy ${formatDiscount(campaign)}`;
  }
  return code.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
    ? `${formatBasisPoints(code.discountValue)}%`
    : formatPlanMoney(code.discountValue);
}

function formatCodeDuration(
  code: AdminAgencyPlanPromotionCampaign['codes'][number],
  campaign: AdminAgencyPlanPromotionCampaign,
): string {
  const cycles = code.durationBillingCycles ?? campaign.durationBillingCycles;
  const timing = code.applicationTiming ?? campaign.applicationTiming;
  return `${cycles} okres${cycles === 1 ? '' : 'y'} · ${AGENCY_PLAN_PROMOTION_APPLICATION_TIMING_LABELS[timing]}`;
}

function formatBasisPoints(value: number): string {
  return (value / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function sortCampaigns(
  left: AdminAgencyPlanPromotionCampaign,
  right: AdminAgencyPlanPromotionCampaign,
) {
  return (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
    left.code.localeCompare(right.code)
  );
}
