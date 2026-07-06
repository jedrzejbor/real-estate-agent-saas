'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Building2,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  enforceAdminAgencyLimits,
  fetchAdminAgencies,
  fetchAdminAgencyLimitEnforcements,
  fetchAdminAgencyPlan,
  fetchAdminPlans,
  resetAdminAgencyPlanOverrides,
  updateAdminAgencyPlan,
  updateAdminPlan,
  type AdminAgencyListItem,
  type AdminAgencyLimitEnforcementResult,
  type AdminLimitEnforcementAuditItem,
  type AdminAgencyPlanResponse,
  type AdminPlan,
  type AgencyPlanCode,
  type AgencyPlanFeatures,
  type AgencyPlanLimits,
} from '@/lib/billing-plans';
import { cn } from '@/lib/utils';

const LIMIT_FIELDS: Array<{
  key: keyof AgencyPlanLimits;
  label: string;
}> = [
  { key: 'activeListings', label: 'Aktywne oferty' },
  { key: 'clients', label: 'Klienci' },
  { key: 'monthlyAppointments', label: 'Spotkania / mies.' },
  { key: 'users', label: 'Użytkownicy' },
  { key: 'imagesPerListing', label: 'Zdjęcia / oferta' },
];

const FEATURE_FIELDS: Array<{
  key: keyof AgencyPlanFeatures;
  label: string;
}> = [
  { key: 'reportsOverview', label: 'Raport overview' },
  { key: 'reportsListingsBasic', label: 'Raport ofert' },
  { key: 'reportsClientsBasic', label: 'Raport klientów' },
  { key: 'reportsAppointmentsBasic', label: 'Raport spotkań' },
  { key: 'publicListings', label: 'Publiczne oferty' },
  { key: 'publicLeadForms', label: 'Formularze leadowe' },
  { key: 'customBranding', label: 'Custom branding' },
  { key: 'multiUser', label: 'Multi-user' },
  { key: 'customDomain', label: 'Własna domena' },
  { key: 'apiAccess', label: 'API access' },
  { key: 'dedicatedSupport', label: 'Dedykowany opiekun' },
];

const PLAN_OPTIONS: AgencyPlanCode[] = [
  'free',
  'starter',
  'professional',
  'enterprise',
  'custom',
];

const PLAN_LABELS: Record<AgencyPlanCode, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  custom: 'Custom',
};

const EMPTY_LIMITS: AgencyPlanLimits = {
  activeListings: 0,
  clients: 0,
  monthlyAppointments: 0,
  users: 0,
  imagesPerListing: 0,
};

const EMPTY_FEATURES: AgencyPlanFeatures = {
  reportsOverview: false,
  reportsListingsBasic: false,
  reportsClientsBasic: false,
  reportsAppointmentsBasic: false,
  publicListings: false,
  publicLeadForms: false,
  customBranding: false,
  multiUser: false,
  customDomain: false,
  apiAccess: false,
  dedicatedSupport: false,
};

export default function AdminPlansPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [agencies, setAgencies] = useState<AdminAgencyListItem[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<AdminPlan['code']>('free');
  const [planDraft, setPlanDraft] = useState<AdminPlan | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [agencyPlan, setAgencyPlan] =
    useState<AdminAgencyPlanResponse | null>(null);
  const [limitEnforcements, setLimitEnforcements] = useState<
    AdminLimitEnforcementAuditItem[]
  >([]);
  const [agencySearch, setAgencySearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [isEnforcingAgency, setIsEnforcingAgency] = useState(false);
  const [isLoadingEnforcements, setIsLoadingEnforcements] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = user?.role === 'admin';

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) ?? null,
    [plans, selectedPlanCode],
  );

  useEffect(() => {
    if (!selectedPlan) return;
    setPlanDraft(structuredClone(selectedPlan));
  }, [selectedPlan]);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [plansResponse, agenciesResponse] = await Promise.all([
          fetchAdminPlans(),
          fetchAdminAgencies(agencySearch),
        ]);

        if (!isMounted) return;
        setPlans(plansResponse);
        setAgencies(agenciesResponse);

        const firstPlan = plansResponse[0];
        if (firstPlan && !plansResponse.some((plan) => plan.code === selectedPlanCode)) {
          setSelectedPlanCode(firstPlan.code);
        }

        if (!selectedAgencyId && agenciesResponse[0]) {
          setSelectedAgencyId(agenciesResponse[0].id);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(loadError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [agencySearch, isAdmin, refreshToken, selectedAgencyId, selectedPlanCode]);

  useEffect(() => {
    if (!isAdmin || !selectedAgencyId) {
      setAgencyPlan(null);
      setLimitEnforcements([]);
      return;
    }

    let isMounted = true;

    fetchAdminAgencyPlan(selectedAgencyId)
      .then((response) => {
        if (isMounted) setAgencyPlan(response);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        showErrorToast({
          title: 'Nie udało się pobrać planu agencji',
          description: getApiErrorMessage(loadError),
        });
        setAgencyPlan(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, selectedAgencyId, showErrorToast, refreshToken]);

  useEffect(() => {
    if (!isAdmin || !selectedAgencyId) {
      setLimitEnforcements([]);
      return;
    }

    let isMounted = true;
    setIsLoadingEnforcements(true);

    fetchAdminAgencyLimitEnforcements(selectedAgencyId, 10)
      .then((response) => {
        if (isMounted) setLimitEnforcements(response);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        showErrorToast({
          title: 'Nie udało się pobrać audytu egzekucji limitów',
          description: getApiErrorMessage(loadError),
        });
        setLimitEnforcements([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingEnforcements(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, selectedAgencyId, showErrorToast, refreshToken]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Panel planów jest dostępny tylko dla administratorów.
        </p>
      </div>
    );
  }

  async function savePlan() {
    if (!planDraft) return;

    const confirmed = await confirm({
      title: 'Potwierdź zmianę planu',
      description: formatImpactDescription(
        getPlanImpactItems(selectedPlan, planDraft),
        'Zapis katalogu planów może zmienić limity, funkcje albo widoczność planu dla nowych i istniejących procesów billingowych.',
      ),
      confirmLabel: 'Zapisz plan',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setIsSavingPlan(true);
    try {
      const updated = await updateAdminPlan(planDraft.code, {
        label: planDraft.label,
        description: planDraft.description,
        priceMonthlyPln: planDraft.priceMonthlyPln,
        priceYearlyPln: planDraft.priceYearlyPln,
        stripePriceIdMonthly: planDraft.stripePriceIdMonthly,
        stripePriceIdYearly: planDraft.stripePriceIdYearly,
        limits: planDraft.limits,
        features: planDraft.features,
        isPublic: planDraft.isPublic,
        sortOrder: planDraft.sortOrder,
      });

      setPlans((current) =>
        current.map((plan) => (plan.code === updated.code ? updated : plan)),
      );
      setPlanDraft(structuredClone(updated));
      showSuccessToast({ title: 'Plan zaktualizowany' });
    } catch (saveError) {
      showErrorToast({
        title: 'Nie udało się zapisać planu',
        description: getApiErrorMessage(saveError),
      });
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function saveAgencyPlan() {
    if (!agencyPlan) return;

    const currentAgency = agencies.find(
      (agency) => agency.id === agencyPlan.agency.id,
    );
    const confirmed = await confirm({
      title: 'Potwierdź zmianę planu agencji',
      description: formatImpactDescription(
        getAgencyImpactItems(agencyPlan, currentAgency),
        'Zmiana planu agencji wpływa na limity pracy zespołu, dostępne funkcje i może uruchomić ostrzeżenia przy downgrade.',
      ),
      confirmLabel: 'Zapisz agencję',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setIsSavingAgency(true);
    try {
      const response = await updateAdminAgencyPlan(agencyPlan.agency.id, {
        plan: agencyPlan.agency.plan,
        planOverrides:
          agencyPlan.agency.plan === 'custom'
            ? (agencyPlan.planOverrides ?? {})
            : null,
      });
      setAgencyPlan(response);
      setAgencies((current) =>
        current.map((agency) =>
          agency.id === response.agency.id
            ? {
                ...agency,
                plan: response.agency.plan,
                subscription: response.agency.subscription,
                planChangedAt: response.agency.planChangedAt,
              }
            : agency,
        ),
      );
      showSuccessToast({ title: 'Plan agencji zaktualizowany' });
    } catch (saveError) {
      showErrorToast({
        title: 'Nie udało się zapisać planu agencji',
        description: getApiErrorMessage(saveError),
      });
    } finally {
      setIsSavingAgency(false);
    }
  }

  async function resetAgencyOverrides() {
    if (!agencyPlan) return;

    const confirmed = await confirm({
      title: 'Wyczyścić override agencji?',
      description:
        'Agencja wróci do limitów i funkcji wynikających z bazowego planu. Indywidualne limity, funkcje, nazwa i cena custom zostaną usunięte.',
      confirmLabel: 'Wyczyść override',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setIsSavingAgency(true);
    try {
      const response = await resetAdminAgencyPlanOverrides(agencyPlan.agency.id);
      setAgencyPlan(response);
      showSuccessToast({ title: 'Nadpisania wyczyszczone' });
    } catch (resetError) {
      showErrorToast({
        title: 'Nie udało się wyczyścić nadpisań',
        description: getApiErrorMessage(resetError),
      });
    } finally {
      setIsSavingAgency(false);
    }
  }

  async function enforceAgencyLimits() {
    if (!agencyPlan) return;

    const confirmed = await confirm({
      title: 'Wymusić egzekucję limitów?',
      description: formatImpactDescription(
        getLimitEnforcementImpactItems(agencyPlan),
        'Ta akcja może zarchiwizować nadmiarowe aktywne oferty i zdjąć je z publikacji publicznej natychmiast, z pominięciem oczekiwania na koniec karencji.',
      ),
      confirmLabel: 'Wymuś egzekucję',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setIsEnforcingAgency(true);
    try {
      const result = await enforceAdminAgencyLimits(agencyPlan.agency.id);
      showSuccessToast({
        title: 'Egzekucja limitów zakończona',
        description: formatEnforcementResult(result),
      });
      setRefreshToken((current) => current + 1);
    } catch (enforceError) {
      showErrorToast({
        title: 'Nie udało się wymusić egzekucji limitów',
        description: getApiErrorMessage(enforceError),
      });
    } finally {
      setIsEnforcingAgency(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">
              Plany i limity
            </h1>
            <Badge variant="outline" className="rounded-full">
              {plans.length} planów
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Konfiguracja katalogu planów i indywidualnych warunków agencji.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => setRefreshToken((current) => current + 1)}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(260px,320px)_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Katalog planów
          </div>
          <div className="space-y-2">
            {plans.map((plan) => (
              <button
                key={plan.code}
                type="button"
                onClick={() => setSelectedPlanCode(plan.code)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  selectedPlanCode === plan.code
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{plan.label}</span>
                  <Badge
                    variant={plan.billingReady ? 'brand' : 'outline'}
                    className="rounded-full"
                  >
                    {plan.billingReady ? 'Billing OK' : 'Billing'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(plan.priceMonthlyPln)} / mies.
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {planDraft ? (
            <PlanEditor
              plan={planDraft}
              baseline={selectedPlan}
              onChange={setPlanDraft}
              onSave={savePlan}
              isSaving={isSavingPlan}
            />
          ) : (
            <EmptyState label="Brak planu do edycji" />
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Agencje
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={agencySearch}
              placeholder="Szukaj agencji..."
              className="h-9 rounded-xl pl-9"
              onChange={(event) => setAgencySearch(event.target.value)}
            />
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {agencies.map((agency) => (
              <button
                key={agency.id}
                type="button"
                onClick={() => setSelectedAgencyId(agency.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  selectedAgencyId === agency.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {agency.name}
                  </span>
                  <Badge variant="outline" className="rounded-full">
                    {PLAN_LABELS[agency.plan]}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {agency.id}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {agencyPlan ? (
            <AgencyPlanEditor
              value={agencyPlan}
              enforcements={limitEnforcements}
              isLoadingEnforcements={isLoadingEnforcements}
              onChange={setAgencyPlan}
              onSave={saveAgencyPlan}
              onReset={resetAgencyOverrides}
              onEnforceLimits={enforceAgencyLimits}
              isSaving={isSavingAgency}
              isEnforcing={isEnforcingAgency}
            />
          ) : (
            <EmptyState label="Wybierz agencję" />
          )}
        </div>
      </section>
    </div>
  );
}

function PlanEditor({
  plan,
  baseline,
  onChange,
  onSave,
  isSaving,
}: {
  plan: AdminPlan;
  baseline: AdminPlan | null;
  onChange: (plan: AdminPlan) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-semibold">
              {plan.label}
            </h2>
            <Badge variant="outline" className="rounded-full">
              {plan.code}
            </Badge>
          </div>
          {plan.billingWarnings.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs text-amber-700">
              {plan.billingWarnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1 text-xs text-status-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Konfiguracja billingowa kompletna
            </div>
          )}
        </div>
        <Button className="gap-2 rounded-xl" onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
          Zapisz plan
        </Button>
      </div>

      <ImpactSummary
        title="Podsumowanie skutków zapisu"
        items={getPlanImpactItems(baseline, plan)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa">
          <Input
            value={plan.label}
            onChange={(event) =>
              onChange({ ...plan, label: event.target.value })
            }
          />
        </Field>
        <Field label="Kolejność">
          <Input
            type="number"
            min={0}
            value={plan.sortOrder}
            onChange={(event) =>
              onChange({ ...plan, sortOrder: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field label="Cena miesięczna, grosze">
          <Input
            type="number"
            min={0}
            value={plan.priceMonthlyPln}
            onChange={(event) =>
              onChange({
                ...plan,
                priceMonthlyPln: toNumber(event.target.value),
              })
            }
          />
        </Field>
        <Field label="Cena roczna, grosze">
          <Input
            type="number"
            min={0}
            value={plan.priceYearlyPln}
            onChange={(event) =>
              onChange({ ...plan, priceYearlyPln: toNumber(event.target.value) })
            }
          />
        </Field>
        <Field label="Stripe monthly">
          <Input
            value={plan.stripePriceIdMonthly ?? ''}
            onChange={(event) =>
              onChange({
                ...plan,
                stripePriceIdMonthly: event.target.value || null,
              })
            }
          />
        </Field>
        <Field label="Stripe yearly">
          <Input
            value={plan.stripePriceIdYearly ?? ''}
            onChange={(event) =>
              onChange({
                ...plan,
                stripePriceIdYearly: event.target.value || null,
              })
            }
          />
        </Field>
      </div>

      <Field label="Opis">
        <textarea
          value={plan.description ?? ''}
          onChange={(event) =>
            onChange({ ...plan, description: event.target.value || null })
          }
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={plan.isPublic}
          onChange={(event) =>
            onChange({ ...plan, isPublic: event.target.checked })
          }
        />
        Publiczny w cenniku
      </label>

      <EditorGrid
        limits={plan.limits}
        features={plan.features}
        onLimitsChange={(limits) => onChange({ ...plan, limits })}
        onFeaturesChange={(features) => onChange({ ...plan, features })}
      />
    </div>
  );
}

function AgencyPlanEditor({
  value,
  enforcements,
  isLoadingEnforcements,
  onChange,
  onSave,
  onReset,
  onEnforceLimits,
  isSaving,
  isEnforcing,
}: {
  value: AdminAgencyPlanResponse;
  enforcements: AdminLimitEnforcementAuditItem[];
  isLoadingEnforcements: boolean;
  onChange: (value: AdminAgencyPlanResponse) => void;
  onSave: () => void;
  onReset: () => void;
  onEnforceLimits: () => void;
  isSaving: boolean;
  isEnforcing: boolean;
}) {
  const overrides = value.planOverrides ?? {};
  const customLimits = {
    ...EMPTY_LIMITS,
    ...value.entitlements.limits,
    ...(overrides.limits ?? {}),
  };
  const customFeatures = {
    ...EMPTY_FEATURES,
    ...value.entitlements.features,
    ...(overrides.features ?? {}),
  };
  const isCustom = value.agency.plan === 'custom';

  function setOverride(nextOverrides: AdminAgencyPlanResponse['planOverrides']) {
    onChange({ ...value, planOverrides: nextOverrides });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-semibold">
              {value.agency.name}
            </h2>
            <Badge variant="outline" className="rounded-full">
              {PLAN_LABELS[value.agency.plan]}
            </Badge>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <Metric label="Oferty" value={value.usage.activeListings} />
            <Metric label="Klienci" value={value.usage.clients} />
            <Metric label="Spotkania" value={value.usage.monthlyAppointments} />
            <Metric label="Użytkownicy" value={value.usage.users} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={onReset}
            disabled={isSaving}
          >
            Wyczyść override
          </Button>
          <Button className="gap-2 rounded-xl" onClick={onSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            Zapisz agencję
          </Button>
        </div>
      </div>

      {value.limitWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {value.limitWarnings.map((warning) => (
            <div key={warning.resource}>{warning.message}</div>
          ))}
        </div>
      ) : null}

      <ImpactSummary
        title="Podsumowanie skutków dla agencji"
        items={getAgencyImpactItems(value)}
      />

      <LimitEnforcementSupportPanel
        agencyPlan={value}
        enforcements={enforcements}
        isLoading={isLoadingEnforcements}
        isEnforcing={isEnforcing}
        onEnforceLimits={onEnforceLimits}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Plan">
          <select
            value={value.agency.plan}
            onChange={(event) =>
              onChange({
                ...value,
                agency: {
                  ...value.agency,
                  plan: event.target.value as AgencyPlanCode,
                },
                planOverrides:
                  event.target.value === 'custom'
                    ? (value.planOverrides ?? { limits: {}, features: {} })
                    : null,
              })
            }
            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-sm"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {PLAN_LABELS[plan]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nazwa custom">
          <Input
            disabled={!isCustom}
            value={overrides.label ?? ''}
            onChange={(event) =>
              setOverride({ ...overrides, label: event.target.value })
            }
          />
        </Field>
        <Field label="Cena custom, mies.">
          <Input
            disabled={!isCustom}
            type="number"
            min={0}
            value={overrides.priceMonthlyPln ?? 0}
            onChange={(event) =>
              setOverride({
                ...overrides,
                priceMonthlyPln: toNumber(event.target.value),
              })
            }
          />
        </Field>
      </div>

      <div className={cn(!isCustom && 'pointer-events-none opacity-50')}>
        <EditorGrid
          limits={customLimits}
          features={customFeatures}
          onLimitsChange={(limits) =>
            setOverride({ ...overrides, limits })
          }
          onFeaturesChange={(features) =>
            setOverride({ ...overrides, features })
          }
        />
      </div>
    </div>
  );
}

type ImpactSeverity = 'neutral' | 'warning' | 'critical' | 'success';

interface ImpactItem {
  label: string;
  value: string;
  severity?: ImpactSeverity;
}

function ImpactSummary({
  title,
  items,
}: {
  title: string;
  items: ImpactItem[];
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-950">{title}</h3>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-lg border border-amber-200 bg-card px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground">{item.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[0.68rem] font-semibold',
                  getImpactSeverityClassName(item.severity ?? 'neutral'),
                )}
              >
                {getImpactSeverityLabel(item.severity ?? 'neutral')}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getPlanImpactItems(
  baseline: AdminPlan | null,
  draft: AdminPlan,
): ImpactItem[] {
  if (!baseline) {
    return [
      {
        label: 'Plan',
        value: `Zapisujesz konfigurację planu ${draft.label}.`,
        severity: 'warning',
      },
    ];
  }

  const items: ImpactItem[] = [];

  if (baseline.isPublic !== draft.isPublic) {
    items.push({
      label: 'Widoczność w cenniku',
      value: draft.isPublic
        ? 'Plan stanie się publicznie dostępny w cenniku.'
        : 'Plan zostanie ukryty w publicznym cenniku.',
      severity: 'critical',
    });
  }

  if (baseline.priceMonthlyPln !== draft.priceMonthlyPln) {
    items.push({
      label: 'Cena miesięczna',
      value: `${formatMoney(baseline.priceMonthlyPln)} -> ${formatMoney(
        draft.priceMonthlyPln,
      )}`,
      severity: 'warning',
    });
  }

  LIMIT_FIELDS.forEach((field) => {
    const previousValue = baseline.limits[field.key];
    const nextValue = draft.limits[field.key];

    if (previousValue === nextValue) return;

    items.push({
      label: `Limit: ${field.label}`,
      value: `${formatLimitValue(previousValue)} -> ${formatLimitValue(
        nextValue,
      )}`,
      severity: isLimitReduction(previousValue, nextValue)
        ? 'critical'
        : 'warning',
    });
  });

  FEATURE_FIELDS.forEach((field) => {
    const previousValue = baseline.features[field.key];
    const nextValue = draft.features[field.key];

    if (previousValue === nextValue) return;

    items.push({
      label: `Funkcja: ${field.label}`,
      value: nextValue ? 'Funkcja zostanie włączona.' : 'Funkcja zostanie wyłączona.',
      severity: nextValue ? 'success' : 'critical',
    });
  });

  return items.length > 0
    ? items
    : [
        {
          label: 'Brak zmian wysokiego wpływu',
          value: 'Nie wykryto zmiany limitów, funkcji, ceny miesięcznej ani widoczności publicznej.',
          severity: 'neutral',
        },
      ];
}

function getAgencyImpactItems(
  value: AdminAgencyPlanResponse,
  currentAgency?: AdminAgencyListItem,
): ImpactItem[] {
  const items: ImpactItem[] = [];
  const previousPlan = currentAgency?.plan;

  if (previousPlan && previousPlan !== value.agency.plan) {
    items.push({
      label: 'Zmiana planu',
      value: `${PLAN_LABELS[previousPlan]} -> ${PLAN_LABELS[value.agency.plan]}`,
      severity: 'critical',
    });
  } else {
    items.push({
      label: 'Plan docelowy',
      value: PLAN_LABELS[value.agency.plan],
      severity: value.agency.plan === 'custom' ? 'warning' : 'neutral',
    });
  }

  items.push({
    label: 'Aktualne użycie',
    value: [
      `${value.usage.activeListings} ofert`,
      `${value.usage.clients} klientów`,
      `${value.usage.monthlyAppointments} spotkań/mies.`,
      `${value.usage.users} użytkowników`,
    ].join(', '),
    severity: 'neutral',
  });

  if (value.agency.plan === 'custom') {
    items.push({
      label: 'Override custom',
      value: `${countPlanOverrides(value.planOverrides)} aktywnych nadpisań limitów, funkcji albo ceny.`,
      severity: 'warning',
    });
  }

  if (value.limitWarnings.length > 0) {
    items.push({
      label: 'Ostrzeżenia limitów',
      value: `${value.limitWarnings.length} ostrzeżeń po zmianie planu. Sprawdź je przed zapisem.`,
      severity: 'critical',
    });
  }

  return items;
}

function getLimitEnforcementImpactItems(
  value: AdminAgencyPlanResponse,
): ImpactItem[] {
  const activeListingsLimit = value.entitlements.limits.activeListings;
  const activeListingsUsage = value.usage.activeListings;
  const excessListings =
    activeListingsLimit === null
      ? 0
      : Math.max(0, activeListingsUsage - activeListingsLimit);

  return [
    {
      label: 'Aktywne oferty',
      value:
        activeListingsLimit === null
          ? `${activeListingsUsage} aktywnych ofert, plan nie ma limitu.`
          : `${activeListingsUsage}/${activeListingsLimit} aktywnych ofert.`,
      severity: excessListings > 0 ? 'critical' : 'neutral',
    },
    {
      label: 'Nadmiar do archiwizacji',
      value:
        excessListings > 0
          ? `${excessListings} ofert może zostać zarchiwizowanych i zdjętych z publikacji.`
          : 'Aktualne użycie mieści się w limicie, więc enforcement powinien zostać pominięty.',
      severity: excessListings > 0 ? 'critical' : 'neutral',
    },
    {
      label: 'Karencja',
      value: value.agency.limitGraceEndsAt
        ? `Koniec karencji: ${formatNullableDateTime(value.agency.limitGraceEndsAt)}. Ręczna egzekucja działa natychmiast.`
        : 'Brak aktywnej karencji zapisanej dla tej agencji.',
      severity: value.agency.limitGraceEndsAt ? 'warning' : 'neutral',
    },
  ];
}

function formatImpactDescription(items: ImpactItem[], fallback: string): string {
  const details = items
    .slice(0, 6)
    .map((item) => `${item.label}: ${item.value}`)
    .join(' ');

  const suffix =
    items.length > 6 ? ` Pokazano 6 z ${items.length} skutków.` : '';

  return `${fallback} ${details}${suffix}`;
}

function getImpactSeverityClassName(severity: ImpactSeverity): string {
  if (severity === 'critical') {
    return 'bg-destructive/10 text-destructive';
  }

  if (severity === 'warning') {
    return 'bg-amber-100 text-amber-800';
  }

  if (severity === 'success') {
    return 'bg-status-success/10 text-status-success';
  }

  return 'bg-muted text-muted-foreground';
}

function getImpactSeverityLabel(severity: ImpactSeverity): string {
  if (severity === 'critical') return 'Wysoki wpływ';
  if (severity === 'warning') return 'Uwaga';
  if (severity === 'success') return 'Włączane';
  return 'Info';
}

function formatLimitValue(value: number | null): string {
  return value === null ? 'Bez limitu' : String(value);
}

function isLimitReduction(
  previousValue: number | null,
  nextValue: number | null,
): boolean {
  if (nextValue === null) return false;
  if (previousValue === null) return true;
  return nextValue < previousValue;
}

function countPlanOverrides(
  overrides: AdminAgencyPlanResponse['planOverrides'],
): number {
  if (!overrides) return 0;

  return [
    overrides.label,
    overrides.priceMonthlyPln,
    overrides.priceYearlyPln,
    ...Object.values(overrides.limits ?? {}),
    ...Object.values(overrides.features ?? {}),
  ].filter((value) => value !== undefined && value !== null).length;
}

function formatEnforcementResult(
  result: AdminAgencyLimitEnforcementResult,
): string {
  if (result.status === 'enforced') {
    return `Zarchiwizowano ${result.archivedListingIds.length} ofert. Użycie przed egzekucją: ${result.activeListingsUsage}, limit: ${formatLimitValue(result.limit)}.`;
  }

  const statusLabels: Record<
    Exclude<AdminAgencyLimitEnforcementResult['status'], 'enforced'>,
    string
  > = {
    skipped_no_limit: 'Pominięto, ponieważ plan nie ma limitu aktywnych ofert.',
    skipped_no_agents: 'Pominięto, ponieważ agencja nie ma agentów.',
    skipped_within_limit: 'Pominięto, ponieważ użycie mieści się w limicie.',
    skipped_grace_active:
      'Pominięto, ponieważ karencja nadal jest aktywna.',
  };

  return statusLabels[result.status];
}

function EditorGrid({
  limits,
  features,
  onLimitsChange,
  onFeaturesChange,
}: {
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
  onLimitsChange: (limits: AgencyPlanLimits) => void;
  onFeaturesChange: (features: AgencyPlanFeatures) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Limity</h3>
        <div className="space-y-2">
          {LIMIT_FIELDS.map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-[1fr_110px_92px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>{field.label}</span>
              <Input
                type="number"
                min={0}
                disabled={limits[field.key] === null}
                value={limits[field.key] ?? 0}
                onChange={(event) =>
                  onLimitsChange({
                    ...limits,
                    [field.key]: toNumber(event.target.value),
                  })
                }
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={limits[field.key] === null}
                  onChange={(event) =>
                    onLimitsChange({
                      ...limits,
                      [field.key]: event.target.checked ? null : 0,
                    })
                  }
                />
                Bez limitu
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Funkcje</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURE_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>{field.label}</span>
              <input
                type="checkbox"
                checked={features[field.key]}
                onChange={(event) =>
                  onFeaturesChange({
                    ...features,
                    [field.key]: event.target.checked,
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function LimitEnforcementSupportPanel({
  agencyPlan,
  enforcements,
  isLoading,
  isEnforcing,
  onEnforceLimits,
}: {
  agencyPlan: AdminAgencyPlanResponse;
  enforcements: AdminLimitEnforcementAuditItem[];
  isLoading: boolean;
  isEnforcing: boolean;
  onEnforceLimits: () => void;
}) {
  const graceStatus = getGraceStatus(agencyPlan);
  const latestEnforcement = enforcements[0] ?? null;
  const archivedCount = enforcements.length;

  return (
    <section className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Karencja i egzekucje limitów
            </h3>
            <Badge variant={graceStatus.variant}>
              {graceStatus.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Dane diagnostyczne dla supportu przy downgrade planu i automatycznej
            archiwizacji nadmiarowych ofert.
          </p>
        </div>

        <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-[420px]">
          <SupportMetric
            label="Koniec karencji"
            value={formatNullableDateTime(agencyPlan.agency.limitGraceEndsAt)}
          />
          <SupportMetric
            label="Ostatnia egzekucja"
            value={formatNullableDateTime(
              agencyPlan.agency.limitGraceEnforcedAt ??
                latestEnforcement?.enforcedAt ??
                null,
            )}
          />
          <SupportMetric
            label="Zarchiwizowane"
            value={isLoading ? '...' : String(archivedCount)}
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-foreground">
                Ręczna egzekucja limitów
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Używaj tylko po weryfikacji planu, użycia i karencji. Akcja może
                zarchiwizować nadmiarowe oferty oraz zdjąć je z publikacji.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="gap-2 rounded-xl"
            disabled={isLoading || isEnforcing}
            onClick={onEnforceLimits}
          >
            <ShieldAlert className="h-4 w-4" />
            {isEnforcing ? 'Egzekwuję...' : 'Wymuś egzekucję'}
          </Button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Ładowanie audytu egzekucji...
          </p>
        ) : enforcements.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Brak automatycznych egzekucji limitu dla tej agencji.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {enforcements.map((item) => (
              <li
                key={item.id}
                className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_140px_120px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate font-medium text-foreground">
                      {item.listingId ?? 'Oferta bez ID'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Status: {formatAuditValue(item.previousStatus)} {'->'}{' '}
                      {formatAuditValue(item.newStatus)}
                    </span>
                    <span>
                      Publikacja:{' '}
                      {formatAuditValue(item.previousPublicationStatus)} {'->'}{' '}
                      {formatAuditValue(item.newPublicationStatus)}
                    </span>
                    <span>Agent: {item.agentId}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Limit: {formatAuditValue(item.planLimit)}</div>
                  <div>
                    Usage: {formatAuditValue(item.usageBeforeEnforcement)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground md:text-right">
                  {formatNullableDateTime(item.enforcedAt ?? item.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SupportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function getGraceStatus(agencyPlan: AdminAgencyPlanResponse): {
  label: string;
  variant: 'success' | 'warning' | 'muted' | 'outline';
} {
  if (agencyPlan.agency.limitGraceEnforcedAt) {
    return { label: 'Egzekucja wykonana', variant: 'success' };
  }

  if (agencyPlan.agency.limitGraceEndsAt) {
    const endsAt = new Date(agencyPlan.agency.limitGraceEndsAt).getTime();
    return endsAt > Date.now()
      ? { label: 'Karencja aktywna', variant: 'warning' }
      : { label: 'Karencja po terminie', variant: 'warning' };
  }

  return { label: 'Brak karencji', variant: 'muted' };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-1">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      <Users className="mr-2 h-4 w-4" />
      {label}
    </div>
  );
}

function toNumber(value: string): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0
    ? Math.floor(numberValue)
    : 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatNullableDateTime(value: string | null): string {
  if (!value) return 'Brak';

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return 'Brak';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
