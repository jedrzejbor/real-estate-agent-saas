'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
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
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchAdminAgencies,
  fetchAdminAgencyPlan,
  fetchAdminPlans,
  resetAdminAgencyPlanOverrides,
  updateAdminAgencyPlan,
  updateAdminPlan,
  type AdminAgencyListItem,
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
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [agencies, setAgencies] = useState<AdminAgencyListItem[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<AdminPlan['code']>('free');
  const [planDraft, setPlanDraft] = useState<AdminPlan | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [agencyPlan, setAgencyPlan] =
    useState<AdminAgencyPlanResponse | null>(null);
  const [agencySearch, setAgencySearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingAgency, setIsSavingAgency] = useState(false);
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
              onChange={setAgencyPlan}
              onSave={saveAgencyPlan}
              onReset={resetAgencyOverrides}
              isSaving={isSavingAgency}
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
  onChange,
  onSave,
  isSaving,
}: {
  plan: AdminPlan;
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
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
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
  onChange,
  onSave,
  onReset,
  isSaving,
}: {
  value: AdminAgencyPlanResponse;
  onChange: (value: AdminAgencyPlanResponse) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
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
