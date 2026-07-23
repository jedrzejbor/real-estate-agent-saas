'use client';

import type { ReactNode } from 'react';
import type {
  ListingAgentProposalCommissionType,
  ListingAgentProposalExclusivity,
  ListingAgentProposalInput,
} from '@/lib/listing-agent-proposals';

export interface ListingAgentProposalFormValues {
  commissionType: ListingAgentProposalCommissionType;
  commissionValue: string;
  minimumContractMonths: string;
  exclusivity: ListingAgentProposalExclusivity | '';
  services: string;
  marketingPlan: string;
  valuationOpinion: string;
  proposedPrice: string;
  availability: string;
  message: string;
  validUntil: string;
}

export type ListingAgentProposalFormErrors = Partial<
  Record<keyof ListingAgentProposalFormValues, string>
>;

export const INITIAL_LISTING_AGENT_PROPOSAL_FORM_VALUES: ListingAgentProposalFormValues =
  {
    commissionType: 'percentage',
    commissionValue: '',
    minimumContractMonths: '',
    exclusivity: '',
    services: '',
    marketingPlan: '',
    valuationOpinion: '',
    proposedPrice: '',
    availability: '',
    message: '',
    validUntil: '',
  };

interface ListingAgentProposalFormProps {
  value: ListingAgentProposalFormValues;
  errors?: ListingAgentProposalFormErrors;
  disabled?: boolean;
  onChange: (value: ListingAgentProposalFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const COMMISSION_TYPE_OPTIONS: Array<{
  value: ListingAgentProposalCommissionType;
  label: string;
}> = [
  { value: 'percentage', label: 'Prowizja procentowa' },
  { value: 'fixed', label: 'Stała kwota' },
  { value: 'mixed', label: 'Model mieszany' },
  { value: 'none', label: 'Bez prowizji' },
];

const EXCLUSIVITY_OPTIONS: Array<{
  value: ListingAgentProposalExclusivity | '';
  label: string;
}> = [
  { value: '', label: 'Do ustalenia' },
  { value: 'exclusive', label: 'Na wyłączność' },
  { value: 'open', label: 'Umowa otwarta' },
  { value: 'flexible', label: 'Elastycznie' },
];

export function buildListingAgentProposalInput(
  values: ListingAgentProposalFormValues,
): ListingAgentProposalInput {
  const services = values.services
    .split(/[\n,]/)
    .map((service) => service.trim())
    .filter(Boolean);

  return {
    commissionType: values.commissionType,
    commissionValue:
      values.commissionType === 'none'
        ? null
        : parseOptionalNumber(values.commissionValue),
    minimumContractMonths: parseOptionalNumber(values.minimumContractMonths),
    exclusivity: values.exclusivity || null,
    services,
    marketingPlan: normalizeOptionalText(values.marketingPlan),
    valuationOpinion: normalizeOptionalText(values.valuationOpinion),
    proposedPrice: parseOptionalNumber(values.proposedPrice),
    availability: normalizeOptionalText(values.availability),
    message: values.message.trim(),
    validUntil: values.validUntil || null,
  };
}

export function ListingAgentProposalForm({
  value,
  errors = {},
  disabled = false,
  onChange,
  onSubmit,
  onCancel,
}: ListingAgentProposalFormProps) {
  const isCommissionValueDisabled = value.commissionType === 'none';

  function update<K extends keyof ListingAgentProposalFormValues>(
    key: K,
    nextValue: ListingAgentProposalFormValues[K],
  ) {
    const next = { ...value, [key]: nextValue };

    if (key === 'commissionType' && nextValue === 'none') {
      next.commissionValue = '';
    }

    onChange(next);
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Model wynagrodzenia" error={errors.commissionType}>
          <select
            value={value.commissionType}
            disabled={disabled}
            onChange={(event) =>
              update(
                'commissionType',
                event.target.value as ListingAgentProposalCommissionType,
              )
            }
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {COMMISSION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Wartość wynagrodzenia" error={errors.commissionValue}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.commissionValue}
            disabled={disabled || isCommissionValueDisabled}
            onChange={(event) =>
              update('commissionValue', event.target.value)
            }
            placeholder={
              isCommissionValueDisabled ? 'Nie dotyczy' : 'np. 2.5 albo 12000'
            }
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField
          label="Minimalny okres współpracy"
          error={errors.minimumContractMonths}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={value.minimumContractMonths}
            disabled={disabled}
            onChange={(event) =>
              update('minimumContractMonths', event.target.value)
            }
            placeholder="Liczba miesięcy"
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField label="Typ współpracy" error={errors.exclusivity}>
          <select
            value={value.exclusivity}
            disabled={disabled}
            onChange={(event) =>
              update(
                'exclusivity',
                event.target.value as ListingAgentProposalExclusivity | '',
              )
            }
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {EXCLUSIVITY_OPTIONS.map((option) => (
              <option key={option.value || 'unset'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Proponowana cena" error={errors.proposedPrice}>
          <input
            type="number"
            min="0"
            step="1"
            value={value.proposedPrice}
            disabled={disabled}
            onChange={(event) => update('proposedPrice', event.target.value)}
            placeholder="Opcjonalnie"
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>

        <FormField label="Ważna do" error={errors.validUntil}>
          <input
            type="date"
            value={value.validUntil}
            disabled={disabled}
            onChange={(event) => update('validUntil', event.target.value)}
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>
      </div>

      <FormField
        label="Zakres usług"
        error={errors.services}
        hint="Wpisz usługi po przecinku albo w osobnych liniach."
      >
        <textarea
          rows={3}
          value={value.services}
          disabled={disabled}
          onChange={(event) => update('services', event.target.value)}
          placeholder="np. profesjonalne zdjęcia, home staging, promocja płatna"
          className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormField>

      <FormField label="Plan marketingowy" error={errors.marketingPlan}>
        <textarea
          rows={3}
          value={value.marketingPlan}
          disabled={disabled}
          onChange={(event) => update('marketingPlan', event.target.value)}
          placeholder="Jak będziesz promować tę ofertę?"
          className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormField>

      <FormField label="Opinia o wycenie" error={errors.valuationOpinion}>
        <textarea
          rows={3}
          value={value.valuationOpinion}
          disabled={disabled}
          onChange={(event) => update('valuationOpinion', event.target.value)}
          placeholder="Opcjonalnie opisz, czy cena wymaga korekty."
          className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormField>

      <FormField label="Dostępność" error={errors.availability}>
        <textarea
          rows={2}
          value={value.availability}
          disabled={disabled}
          onChange={(event) => update('availability', event.target.value)}
          placeholder="Kiedy możesz rozpocząć współpracę?"
          className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormField>

      <FormField label="Wiadomość do właściciela" error={errors.message}>
        <textarea
          rows={4}
          value={value.message}
          disabled={disabled}
          onChange={(event) => update('message', event.target.value)}
          placeholder="Napisz konkretnie, dlaczego właściciel powinien wybrać Twoją ofertę współpracy."
          className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Wyślij propozycję
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
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

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
