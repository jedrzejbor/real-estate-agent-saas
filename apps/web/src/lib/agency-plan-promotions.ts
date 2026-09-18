import { z } from 'zod';
import { apiFetch } from './api-client';
import type { AgencyPlanCode } from './billing-plans';

export const AgencyPlanPromotionStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const;

export type AgencyPlanPromotionStatus =
  (typeof AgencyPlanPromotionStatus)[keyof typeof AgencyPlanPromotionStatus];

export const AgencyPlanPromotionDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED_GROSS: 'fixed_gross',
} as const;

export type AgencyPlanPromotionDiscountType =
  (typeof AgencyPlanPromotionDiscountType)[keyof typeof AgencyPlanPromotionDiscountType];

export const AgencyPlanPromotionTargetScope = {
  ALL_PLANS: 'all_plans',
  PLAN_CODES: 'plan_codes',
  BILLING_INTERVALS: 'billing_intervals',
} as const;

export type AgencyPlanPromotionTargetScope =
  (typeof AgencyPlanPromotionTargetScope)[keyof typeof AgencyPlanPromotionTargetScope];

export const AgencyPlanPromotionApplicationTiming = {
  INITIAL_CHECKOUT: 'initial_checkout',
  NEXT_INVOICE: 'next_invoice',
  FUTURE_INVOICES: 'future_invoices',
} as const;

export type AgencyPlanPromotionApplicationTiming =
  (typeof AgencyPlanPromotionApplicationTiming)[keyof typeof AgencyPlanPromotionApplicationTiming];

export type AgencyPlanBillingInterval = 'monthly' | 'yearly';

export const AGENCY_PLAN_PROMOTION_STATUS_LABELS: Record<
  AgencyPlanPromotionStatus,
  string
> = {
  draft: 'Szkic',
  active: 'Aktywna',
  paused: 'Wstrzymana',
  archived: 'Archiwum',
};

export const AGENCY_PLAN_PROMOTION_DISCOUNT_TYPE_LABELS: Record<
  AgencyPlanPromotionDiscountType,
  string
> = {
  percentage: 'Procent',
  fixed_gross: 'Kwota brutto',
};

export const AGENCY_PLAN_PROMOTION_TARGET_SCOPE_LABELS: Record<
  AgencyPlanPromotionTargetScope,
  string
> = {
  all_plans: 'Wszystkie plany',
  plan_codes: 'Wybrane plany',
  billing_intervals: 'Okresy rozliczenia',
};

export const AGENCY_PLAN_PROMOTION_APPLICATION_TIMING_LABELS: Record<
  AgencyPlanPromotionApplicationTiming,
  string
> = {
  initial_checkout: 'Zakup planu',
  next_invoice: 'Kolejna płatność',
  future_invoices: 'Kolejne płatności',
};

export const AGENCY_PLAN_LABELS: Record<AgencyPlanCode, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  custom: 'Custom',
};

export const AGENCY_PLAN_BILLING_INTERVAL_LABELS: Record<
  AgencyPlanBillingInterval,
  string
> = {
  monthly: 'Miesięcznie',
  yearly: 'Rocznie',
};

export const AGENCY_PLAN_OPTIONS: AgencyPlanCode[] = [
  'free',
  'starter',
  'professional',
  'enterprise',
];

export const AGENCY_PLAN_BILLING_INTERVAL_OPTIONS: AgencyPlanBillingInterval[] = [
  'monthly',
  'yearly',
];

export interface AgencyPlanPromotionTargetRules {
  planCodes?: AgencyPlanCode[];
  billingIntervals?: AgencyPlanBillingInterval[];
  minimumSubtotalGrossAmount?: number;
}

export interface AdminAgencyPlanPromotionCode {
  id: string;
  campaignId: string;
  codeLast4: string | null;
  label: string;
  status: AgencyPlanPromotionStatus;
  discountType: AgencyPlanPromotionDiscountType | null;
  discountValue: number | null;
  maxDiscountGrossAmount: number | null;
  durationBillingCycles: number | null;
  applicationTiming: AgencyPlanPromotionApplicationTiming | null;
  isCombinable: boolean | null;
  usageLimitTotal: number | null;
  usageLimitPerAccount: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAgencyPlanPromotionCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AgencyPlanPromotionStatus;
  discountType: AgencyPlanPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: AgencyPlanPromotionTargetScope;
  targetRules: AgencyPlanPromotionTargetRules;
  durationBillingCycles: number;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: number | null;
  usageLimitPerAccount: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  codes: AdminAgencyPlanPromotionCode[];
}

export interface AgencyPlanPromotionCampaignFormValues {
  code: string;
  name: string;
  description: string;
  status: AgencyPlanPromotionStatus;
  discountType: AgencyPlanPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  maxDiscountGrossPln: string;
  targetScope: AgencyPlanPromotionTargetScope;
  planCodes: AgencyPlanCode[];
  billingIntervals: AgencyPlanBillingInterval[];
  minimumSubtotalGrossPln: string;
  durationBillingCycles: string;
  applicationTiming: AgencyPlanPromotionApplicationTiming;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: string;
  usageLimitPerAccount: string;
  startsAt: string;
  endsAt: string;
}

export interface AgencyPlanPromotionCodeFormValues {
  code: string;
  label: string;
  status: AgencyPlanPromotionStatus;
  discountType: '' | AgencyPlanPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  maxDiscountGrossPln: string;
  durationBillingCycles: string;
  applicationTiming: '' | AgencyPlanPromotionApplicationTiming;
  isCombinable: 'inherit' | 'true' | 'false';
  usageLimitTotal: string;
  usageLimitPerAccount: string;
  startsAt: string;
  endsAt: string;
}

export type AgencyPlanPromotionCampaignFormField =
  keyof AgencyPlanPromotionCampaignFormValues;
export type AgencyPlanPromotionCampaignFormErrors = Partial<
  Record<AgencyPlanPromotionCampaignFormField, string>
>;
export type AgencyPlanPromotionCodeFormField =
  keyof AgencyPlanPromotionCodeFormValues;
export type AgencyPlanPromotionCodeFormErrors = Partial<
  Record<AgencyPlanPromotionCodeFormField, string>
>;

const optionalMoneyInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+(?:[.,]\d{1,2})?$/.test(value),
    'Podaj kwotę z maksymalnie 2 miejscami po przecinku',
  )
  .refine(
    (value) => value === '' || decimalToInteger(value, 2) <= 2_147_483_647,
    'Kwota jest zbyt wysoka',
  );

const optionalIntegerSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+$/.test(value),
    'Podaj liczbę całkowitą',
  )
  .refine(
    (value) => value === '' || Number(value) <= 2_147_483_647,
    'Limit jest zbyt wysoki',
  );

const optionalDateTimeSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
    'Podaj poprawną datę',
  );

const durationBillingCyclesSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value), 'Podaj liczbę okresów')
  .refine((value) => Number(value) >= 1, 'Minimum to 1 okres')
  .refine((value) => Number(value) <= 120, 'Maksymalnie 120 okresów');

const optionalDurationBillingCyclesSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d+$/.test(value),
    'Podaj liczbę okresów',
  )
  .refine(
    (value) => value === '' || Number(value) >= 1,
    'Minimum to 1 okres',
  )
  .refine(
    (value) => value === '' || Number(value) <= 120,
    'Maksymalnie 120 okresów',
  );

const percentageSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^\d+(?:[.,]\d{1,2})?$/.test(value),
    'Podaj procent z maksymalnie 2 miejscami po przecinku',
  )
  .refine(
    (value) => decimalToInteger(value, 2) >= 1,
    'Rabat musi być większy od 0',
  )
  .refine(
    (value) => decimalToInteger(value, 2) <= 10_000,
    'Rabat procentowy nie może przekraczać 100%',
  );

const campaignFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kod musi mieć co najmniej 3 znaki')
      .max(80, 'Kod może mieć maksymalnie 80 znaków')
      .regex(
        /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
        'Użyj małych liter, cyfr i pojedynczych podkreśleń',
      ),
    name: z.string().trim().min(1, 'Nazwa jest wymagana').max(160),
    description: z.string().trim().max(2_000),
    status: z.enum([
      AgencyPlanPromotionStatus.DRAFT,
      AgencyPlanPromotionStatus.ACTIVE,
      AgencyPlanPromotionStatus.PAUSED,
      AgencyPlanPromotionStatus.ARCHIVED,
    ]),
    discountType: z.enum([
      AgencyPlanPromotionDiscountType.PERCENTAGE,
      AgencyPlanPromotionDiscountType.FIXED_GROSS,
    ]),
    discountPercent: z.string(),
    discountGrossPln: z.string(),
    maxDiscountGrossPln: optionalMoneyInputSchema,
    targetScope: z.enum([
      AgencyPlanPromotionTargetScope.ALL_PLANS,
      AgencyPlanPromotionTargetScope.PLAN_CODES,
      AgencyPlanPromotionTargetScope.BILLING_INTERVALS,
    ]),
    planCodes: z.array(z.enum(['free', 'starter', 'professional', 'enterprise'])),
    billingIntervals: z.array(z.enum(['monthly', 'yearly'])),
    minimumSubtotalGrossPln: optionalMoneyInputSchema,
    durationBillingCycles: durationBillingCyclesSchema,
    applicationTiming: z.enum([
      AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      AgencyPlanPromotionApplicationTiming.NEXT_INVOICE,
      AgencyPlanPromotionApplicationTiming.FUTURE_INVOICES,
    ]),
    isAutomatic: z.boolean(),
    isCombinable: z.boolean(),
    usageLimitTotal: optionalIntegerSchema,
    usageLimitPerAccount: optionalIntegerSchema,
    startsAt: optionalDateTimeSchema,
    endsAt: optionalDateTimeSchema,
  })
  .superRefine((value, context) => {
    validateDiscountValue(value, context);
    validateTargetRules(value, context);
    validateDateRange(value, context);
  });

const codeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kod musi mieć co najmniej 3 znaki')
      .max(80, 'Kod może mieć maksymalnie 80 znaków')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Kod może zawierać litery, cyfry, myślnik i podkreślenie',
      ),
    label: z.string().trim().min(1, 'Etykieta jest wymagana').max(160),
    status: z.enum([
      AgencyPlanPromotionStatus.DRAFT,
      AgencyPlanPromotionStatus.ACTIVE,
      AgencyPlanPromotionStatus.PAUSED,
      AgencyPlanPromotionStatus.ARCHIVED,
    ]),
    discountType: z.union([
      z.literal(''),
      z.literal(AgencyPlanPromotionDiscountType.PERCENTAGE),
      z.literal(AgencyPlanPromotionDiscountType.FIXED_GROSS),
    ]),
    discountPercent: z.string(),
    discountGrossPln: z.string(),
    maxDiscountGrossPln: optionalMoneyInputSchema,
    durationBillingCycles: optionalDurationBillingCyclesSchema,
    applicationTiming: z.union([
      z.literal(''),
      z.literal(AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT),
      z.literal(AgencyPlanPromotionApplicationTiming.NEXT_INVOICE),
      z.literal(AgencyPlanPromotionApplicationTiming.FUTURE_INVOICES),
    ]),
    isCombinable: z.enum(['inherit', 'true', 'false']),
    usageLimitTotal: optionalIntegerSchema,
    usageLimitPerAccount: optionalIntegerSchema,
    startsAt: optionalDateTimeSchema,
    endsAt: optionalDateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.discountType) validateDiscountValue(value, context);
    validateDateRange(value, context);
  });

export function createEmptyAgencyPlanPromotionCampaignForm():
  AgencyPlanPromotionCampaignFormValues {
  return {
    code: '',
    name: '',
    description: '',
    status: AgencyPlanPromotionStatus.DRAFT,
    discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
    discountPercent: '',
    discountGrossPln: '',
    maxDiscountGrossPln: '',
    targetScope: AgencyPlanPromotionTargetScope.ALL_PLANS,
    planCodes: [],
    billingIntervals: [],
    minimumSubtotalGrossPln: '',
    durationBillingCycles: '1',
    applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
    isAutomatic: false,
    isCombinable: false,
    usageLimitTotal: '',
    usageLimitPerAccount: '',
    startsAt: '',
    endsAt: '',
  };
}

export function createEmptyAgencyPlanPromotionCodeForm():
  AgencyPlanPromotionCodeFormValues {
  return {
    code: '',
    label: '',
    status: AgencyPlanPromotionStatus.ACTIVE,
    discountType: '',
    discountPercent: '',
    discountGrossPln: '',
    maxDiscountGrossPln: '',
    durationBillingCycles: '',
    applicationTiming: '',
    isCombinable: 'inherit',
    usageLimitTotal: '',
    usageLimitPerAccount: '',
    startsAt: '',
    endsAt: '',
  };
}

export function toAgencyPlanPromotionCampaignForm(
  campaign: AdminAgencyPlanPromotionCampaign,
): AgencyPlanPromotionCampaignFormValues {
  return {
    code: campaign.code,
    name: campaign.name,
    description: campaign.description ?? '',
    status: campaign.status,
    discountType: campaign.discountType,
    discountPercent:
      campaign.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
        ? integerToDecimal(campaign.discountValue, 2)
        : '',
    discountGrossPln:
      campaign.discountType === AgencyPlanPromotionDiscountType.FIXED_GROSS
        ? integerToDecimal(campaign.discountValue, 2)
        : '',
    maxDiscountGrossPln:
      campaign.maxDiscountGrossAmount === null
        ? ''
        : integerToDecimal(campaign.maxDiscountGrossAmount, 2),
    targetScope: campaign.targetScope,
    planCodes: campaign.targetRules.planCodes?.filter(isEditablePlanCode) ?? [],
    billingIntervals: campaign.targetRules.billingIntervals ?? [],
    minimumSubtotalGrossPln:
      campaign.targetRules.minimumSubtotalGrossAmount === undefined
        ? ''
        : integerToDecimal(campaign.targetRules.minimumSubtotalGrossAmount, 2),
    durationBillingCycles: String(campaign.durationBillingCycles),
    applicationTiming: campaign.applicationTiming,
    isAutomatic: campaign.isAutomatic,
    isCombinable: campaign.isCombinable,
    usageLimitTotal:
      campaign.usageLimitTotal === null ? '' : String(campaign.usageLimitTotal),
    usageLimitPerAccount:
      campaign.usageLimitPerAccount === null
        ? ''
        : String(campaign.usageLimitPerAccount),
    startsAt: toDateTimeLocal(campaign.startsAt),
    endsAt: toDateTimeLocal(campaign.endsAt),
  };
}

export function validateAgencyPlanPromotionCampaignForm(
  values: AgencyPlanPromotionCampaignFormValues,
): {
  data?: AgencyPlanPromotionCampaignFormValues;
  errors: AgencyPlanPromotionCampaignFormErrors;
} {
  const parsed = campaignFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };
  return { errors: collectErrors(parsed.error.issues) };
}

export function validateAgencyPlanPromotionCodeForm(
  values: AgencyPlanPromotionCodeFormValues,
): {
  data?: AgencyPlanPromotionCodeFormValues;
  errors: AgencyPlanPromotionCodeFormErrors;
} {
  const parsed = codeFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };
  return { errors: collectErrors(parsed.error.issues) };
}

export function toCreateAgencyPlanPromotionCampaignInput(
  values: AgencyPlanPromotionCampaignFormValues,
) {
  const parsed = campaignFormSchema.parse(values);
  return toAgencyPlanPromotionCampaignInput(parsed, true);
}

export function toUpdateAgencyPlanPromotionCampaignInput(
  values: AgencyPlanPromotionCampaignFormValues,
) {
  const parsed = campaignFormSchema.parse(values);
  return toAgencyPlanPromotionCampaignInput(parsed, false);
}

export function toCreateAgencyPlanPromotionCodeInput(
  values: AgencyPlanPromotionCodeFormValues,
) {
  const parsed = codeFormSchema.parse(values);
  return {
    code: parsed.code.trim(),
    label: parsed.label.trim(),
    status: parsed.status,
    ...(parsed.discountType
      ? {
          discountType: parsed.discountType,
          discountValue: getDiscountValue(parsed),
        }
      : {}),
    ...nullableMoney('maxDiscountGrossAmount', parsed.maxDiscountGrossPln),
    ...nullableInteger('durationBillingCycles', parsed.durationBillingCycles),
    ...(parsed.applicationTiming
      ? { applicationTiming: parsed.applicationTiming }
      : { applicationTiming: null }),
    ...(parsed.isCombinable === 'inherit'
      ? {}
      : { isCombinable: parsed.isCombinable === 'true' }),
    ...nullableInteger('usageLimitTotal', parsed.usageLimitTotal),
    ...nullableInteger('usageLimitPerAccount', parsed.usageLimitPerAccount),
    ...nullableDate('startsAt', parsed.startsAt),
    ...nullableDate('endsAt', parsed.endsAt),
  };
}

export function fetchAdminAgencyPlanPromotions():
  Promise<AdminAgencyPlanPromotionCampaign[]> {
  return apiFetch<AdminAgencyPlanPromotionCampaign[]>(
    '/admin/agency-plan-promotions',
  );
}

export function createAdminAgencyPlanPromotionCampaign(
  input: ReturnType<typeof toCreateAgencyPlanPromotionCampaignInput>,
): Promise<AdminAgencyPlanPromotionCampaign> {
  return apiFetch<AdminAgencyPlanPromotionCampaign>(
    '/admin/agency-plan-promotions',
    { method: 'POST', body: input },
  );
}

export function updateAdminAgencyPlanPromotionCampaign(
  code: string,
  input: Partial<ReturnType<typeof toUpdateAgencyPlanPromotionCampaignInput>>,
): Promise<AdminAgencyPlanPromotionCampaign> {
  return apiFetch<AdminAgencyPlanPromotionCampaign>(
    `/admin/agency-plan-promotions/${encodeURIComponent(code)}`,
    { method: 'PATCH', body: input },
  );
}

export function archiveAdminAgencyPlanPromotionCampaign(
  code: string,
): Promise<AdminAgencyPlanPromotionCampaign> {
  return apiFetch<AdminAgencyPlanPromotionCampaign>(
    `/admin/agency-plan-promotions/${encodeURIComponent(code)}/archive`,
    { method: 'POST' },
  );
}

export function restoreAdminAgencyPlanPromotionCampaign(
  code: string,
): Promise<AdminAgencyPlanPromotionCampaign> {
  return apiFetch<AdminAgencyPlanPromotionCampaign>(
    `/admin/agency-plan-promotions/${encodeURIComponent(code)}/restore`,
    { method: 'POST' },
  );
}

export function createAdminAgencyPlanPromotionCode(
  campaignCode: string,
  input: ReturnType<typeof toCreateAgencyPlanPromotionCodeInput>,
): Promise<AdminAgencyPlanPromotionCampaign> {
  return apiFetch<AdminAgencyPlanPromotionCampaign>(
    `/admin/agency-plan-promotions/${encodeURIComponent(campaignCode)}/codes`,
    { method: 'POST', body: input },
  );
}

function toAgencyPlanPromotionCampaignInput(
  parsed: AgencyPlanPromotionCampaignFormValues,
  includeCode: boolean,
) {
  return {
    ...(includeCode ? { code: parsed.code.trim().toLowerCase() } : {}),
    name: parsed.name.trim(),
    description: emptyToNull(parsed.description),
    status: parsed.status,
    discountType: parsed.discountType,
    discountValue: getDiscountValue(parsed),
    ...nullableMoney('maxDiscountGrossAmount', parsed.maxDiscountGrossPln),
    targetScope: parsed.targetScope,
    targetRules: buildTargetRules(parsed),
    durationBillingCycles: Number(parsed.durationBillingCycles),
    applicationTiming: parsed.applicationTiming,
    isAutomatic: parsed.isAutomatic,
    isCombinable: parsed.isCombinable,
    ...nullableInteger('usageLimitTotal', parsed.usageLimitTotal),
    ...nullableInteger('usageLimitPerAccount', parsed.usageLimitPerAccount),
    ...nullableDate('startsAt', parsed.startsAt),
    ...nullableDate('endsAt', parsed.endsAt),
  };
}

function validateDiscountValue(
  value:
    | AgencyPlanPromotionCampaignFormValues
    | AgencyPlanPromotionCodeFormValues,
  context: z.RefinementCtx,
) {
  const source =
    value.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
      ? value.discountPercent
      : value.discountGrossPln;
  const schema =
    value.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
      ? percentageSchema
      : optionalMoneyInputSchema.refine((input) => input !== '', 'Podaj kwotę');
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    context.addIssue({
      code: 'custom',
      path: [
        value.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
          ? 'discountPercent'
          : 'discountGrossPln',
      ],
      message: parsed.error.issues[0]?.message ?? 'Nieprawidłowy rabat',
    });
  }
}

function validateTargetRules(
  value: AgencyPlanPromotionCampaignFormValues,
  context: z.RefinementCtx,
) {
  if (
    value.targetScope === AgencyPlanPromotionTargetScope.PLAN_CODES &&
    !value.planCodes.length
  ) {
    context.addIssue({
      code: 'custom',
      path: ['planCodes'],
      message: 'Wybierz co najmniej jeden plan',
    });
  }
  if (
    value.targetScope === AgencyPlanPromotionTargetScope.BILLING_INTERVALS &&
    !value.billingIntervals.length
  ) {
    context.addIssue({
      code: 'custom',
      path: ['billingIntervals'],
      message: 'Wybierz co najmniej jeden okres rozliczenia',
    });
  }
}

function validateDateRange(
  value:
    | AgencyPlanPromotionCampaignFormValues
    | AgencyPlanPromotionCodeFormValues,
  context: z.RefinementCtx,
) {
  if (!value.startsAt || !value.endsAt) return;
  if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'Data końca musi być późniejsza niż start',
    });
  }
}

function getDiscountValue(
  value:
    | AgencyPlanPromotionCampaignFormValues
    | AgencyPlanPromotionCodeFormValues,
): number {
  return value.discountType === AgencyPlanPromotionDiscountType.PERCENTAGE
    ? decimalToInteger(value.discountPercent, 2)
    : decimalToInteger(value.discountGrossPln, 2);
}

function buildTargetRules(
  value: AgencyPlanPromotionCampaignFormValues,
): AgencyPlanPromotionTargetRules {
  const minimumSubtotal = nullableMoneyValue(value.minimumSubtotalGrossPln);
  const minimumRule =
    minimumSubtotal === null
      ? {}
      : { minimumSubtotalGrossAmount: minimumSubtotal };

  if (value.targetScope === AgencyPlanPromotionTargetScope.PLAN_CODES) {
    return {
      planCodes: value.planCodes,
      ...(value.billingIntervals.length
        ? { billingIntervals: value.billingIntervals }
        : {}),
      ...minimumRule,
    };
  }
  if (value.targetScope === AgencyPlanPromotionTargetScope.BILLING_INTERVALS) {
    return {
      ...(value.planCodes.length ? { planCodes: value.planCodes } : {}),
      billingIntervals: value.billingIntervals,
      ...minimumRule,
    };
  }
  return {
    ...(value.planCodes.length ? { planCodes: value.planCodes } : {}),
    ...(value.billingIntervals.length
      ? { billingIntervals: value.billingIntervals }
      : {}),
    ...minimumRule,
  };
}

function nullableMoney(key: string, value: string): Record<string, number | null> {
  return { [key]: nullableMoneyValue(value) };
}

function nullableMoneyValue(value: string): number | null {
  return value.trim() ? decimalToInteger(value, 2) : null;
}

function nullableInteger(
  key: string,
  value: string,
): Record<string, number | null> {
  return { [key]: value.trim() ? Number(value) : null };
}

function nullableDate(key: string, value: string): Record<string, string | null> {
  return {
    [key]: value.trim() ? new Date(value).toISOString() : null,
  };
}

function collectErrors<TField extends string>(
  issues: z.ZodIssue[],
): Partial<Record<TField, string>> {
  const errors: Partial<Record<TField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as TField] = issue.message;
    }
  }
  return errors;
}

function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function decimalToInteger(value: string, precision: number): number {
  const normalized = value.trim().replace(',', '.');
  const [whole = '0', fraction = ''] = normalized.split('.');
  return (
    Number(whole) * 10 ** precision +
    Number(fraction.padEnd(precision, '0').slice(0, precision))
  );
}

function integerToDecimal(value: number, precision: number): string {
  return (value / 10 ** precision).toFixed(precision);
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function isEditablePlanCode(value: AgencyPlanCode): value is Exclude<
  AgencyPlanCode,
  'custom'
> {
  return value !== 'custom';
}
