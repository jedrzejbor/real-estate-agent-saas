import { z } from 'zod';
import { apiFetch } from './api-client';
import { ListingProductType } from './listing-products';

export const ListingPromotionCampaignStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const;

export type ListingPromotionCampaignStatus =
  (typeof ListingPromotionCampaignStatus)[keyof typeof ListingPromotionCampaignStatus];

export const ListingPromotionDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED_GROSS: 'fixed_gross',
} as const;

export type ListingPromotionDiscountType =
  (typeof ListingPromotionDiscountType)[keyof typeof ListingPromotionDiscountType];

export const ListingPromotionTargetScope = {
  ALL_PRODUCTS: 'all_products',
  PRODUCT_TYPES: 'product_types',
  PRODUCT_CODES: 'product_codes',
} as const;

export type ListingPromotionTargetScope =
  (typeof ListingPromotionTargetScope)[keyof typeof ListingPromotionTargetScope];

export const PROMOTION_STATUS_LABELS: Record<
  ListingPromotionCampaignStatus,
  string
> = {
  draft: 'Szkic',
  active: 'Aktywna',
  paused: 'Wstrzymana',
  archived: 'Archiwum',
};

export const PROMOTION_DISCOUNT_TYPE_LABELS: Record<
  ListingPromotionDiscountType,
  string
> = {
  percentage: 'Procent',
  fixed_gross: 'Kwota brutto',
};

export const PROMOTION_TARGET_SCOPE_LABELS: Record<
  ListingPromotionTargetScope,
  string
> = {
  all_products: 'Wszystkie produkty',
  product_types: 'Typy produktów',
  product_codes: 'Kody produktów',
};

export interface ListingPromotionTargetRules {
  productTypes?: ListingProductType[];
  productCodes?: string[];
  minimumSubtotalGrossAmount?: number;
}

export interface AdminListingPromotionCode {
  id: string;
  campaignId: string;
  codeLast4: string | null;
  label: string;
  status: ListingPromotionCampaignStatus;
  discountType: ListingPromotionDiscountType | null;
  discountValue: number | null;
  maxDiscountGrossAmount: number | null;
  isCombinable: boolean | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListingPromotionCampaign {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ListingPromotionCampaignStatus;
  discountType: ListingPromotionDiscountType;
  discountValue: number;
  maxDiscountGrossAmount: number | null;
  targetScope: ListingPromotionTargetScope;
  targetRules: ListingPromotionTargetRules;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  codes: AdminListingPromotionCode[];
}

export interface ListingPromotionCampaignFormValues {
  code: string;
  name: string;
  description: string;
  status: ListingPromotionCampaignStatus;
  discountType: ListingPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  maxDiscountGrossPln: string;
  targetScope: ListingPromotionTargetScope;
  productTypes: ListingProductType[];
  productCodes: string;
  minimumSubtotalGrossPln: string;
  isAutomatic: boolean;
  isCombinable: boolean;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  startsAt: string;
  endsAt: string;
}

export interface ListingPromotionCodeFormValues {
  code: string;
  label: string;
  status: ListingPromotionCampaignStatus;
  discountType: '' | ListingPromotionDiscountType;
  discountPercent: string;
  discountGrossPln: string;
  maxDiscountGrossPln: string;
  isCombinable: 'inherit' | 'true' | 'false';
  usageLimitTotal: string;
  usageLimitPerUser: string;
  startsAt: string;
  endsAt: string;
}

export type ListingPromotionCampaignFormField =
  keyof ListingPromotionCampaignFormValues;
export type ListingPromotionCampaignFormErrors = Partial<
  Record<ListingPromotionCampaignFormField, string>
>;
export type ListingPromotionCodeFormField =
  keyof ListingPromotionCodeFormValues;
export type ListingPromotionCodeFormErrors = Partial<
  Record<ListingPromotionCodeFormField, string>
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
      ListingPromotionCampaignStatus.DRAFT,
      ListingPromotionCampaignStatus.ACTIVE,
      ListingPromotionCampaignStatus.PAUSED,
      ListingPromotionCampaignStatus.ARCHIVED,
    ]),
    discountType: z.enum([
      ListingPromotionDiscountType.PERCENTAGE,
      ListingPromotionDiscountType.FIXED_GROSS,
    ]),
    discountPercent: z.string(),
    discountGrossPln: z.string(),
    maxDiscountGrossPln: optionalMoneyInputSchema,
    targetScope: z.enum([
      ListingPromotionTargetScope.ALL_PRODUCTS,
      ListingPromotionTargetScope.PRODUCT_TYPES,
      ListingPromotionTargetScope.PRODUCT_CODES,
    ]),
    productTypes: z.array(
      z.enum([
        ListingProductType.PUBLICATION,
        ListingProductType.RENEWAL,
        ListingProductType.FEATURED,
      ]),
    ),
    productCodes: z.string().trim().max(2_000),
    minimumSubtotalGrossPln: optionalMoneyInputSchema,
    isAutomatic: z.boolean(),
    isCombinable: z.boolean(),
    usageLimitTotal: optionalIntegerSchema,
    usageLimitPerUser: optionalIntegerSchema,
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
      ListingPromotionCampaignStatus.DRAFT,
      ListingPromotionCampaignStatus.ACTIVE,
      ListingPromotionCampaignStatus.PAUSED,
      ListingPromotionCampaignStatus.ARCHIVED,
    ]),
    discountType: z.union([
      z.literal(''),
      z.literal(ListingPromotionDiscountType.PERCENTAGE),
      z.literal(ListingPromotionDiscountType.FIXED_GROSS),
    ]),
    discountPercent: z.string(),
    discountGrossPln: z.string(),
    maxDiscountGrossPln: optionalMoneyInputSchema,
    isCombinable: z.enum(['inherit', 'true', 'false']),
    usageLimitTotal: optionalIntegerSchema,
    usageLimitPerUser: optionalIntegerSchema,
    startsAt: optionalDateTimeSchema,
    endsAt: optionalDateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.discountType) validateDiscountValue(value, context);
    validateDateRange(value, context);
  });

export function createEmptyPromotionCampaignForm():
  ListingPromotionCampaignFormValues {
  return {
    code: '',
    name: '',
    description: '',
    status: ListingPromotionCampaignStatus.DRAFT,
    discountType: ListingPromotionDiscountType.PERCENTAGE,
    discountPercent: '',
    discountGrossPln: '',
    maxDiscountGrossPln: '',
    targetScope: ListingPromotionTargetScope.ALL_PRODUCTS,
    productTypes: [],
    productCodes: '',
    minimumSubtotalGrossPln: '',
    isAutomatic: false,
    isCombinable: false,
    usageLimitTotal: '',
    usageLimitPerUser: '',
    startsAt: '',
    endsAt: '',
  };
}

export function createEmptyPromotionCodeForm(): ListingPromotionCodeFormValues {
  return {
    code: '',
    label: '',
    status: ListingPromotionCampaignStatus.ACTIVE,
    discountType: '',
    discountPercent: '',
    discountGrossPln: '',
    maxDiscountGrossPln: '',
    isCombinable: 'inherit',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    startsAt: '',
    endsAt: '',
  };
}

export function toPromotionCampaignForm(
  campaign: AdminListingPromotionCampaign,
): ListingPromotionCampaignFormValues {
  return {
    code: campaign.code,
    name: campaign.name,
    description: campaign.description ?? '',
    status: campaign.status,
    discountType: campaign.discountType,
    discountPercent:
      campaign.discountType === ListingPromotionDiscountType.PERCENTAGE
        ? integerToDecimal(campaign.discountValue, 2)
        : '',
    discountGrossPln:
      campaign.discountType === ListingPromotionDiscountType.FIXED_GROSS
        ? integerToDecimal(campaign.discountValue, 2)
        : '',
    maxDiscountGrossPln:
      campaign.maxDiscountGrossAmount === null
        ? ''
        : integerToDecimal(campaign.maxDiscountGrossAmount, 2),
    targetScope: campaign.targetScope,
    productTypes: campaign.targetRules.productTypes ?? [],
    productCodes: (campaign.targetRules.productCodes ?? []).join(', '),
    minimumSubtotalGrossPln:
      campaign.targetRules.minimumSubtotalGrossAmount === undefined
        ? ''
        : integerToDecimal(campaign.targetRules.minimumSubtotalGrossAmount, 2),
    isAutomatic: campaign.isAutomatic,
    isCombinable: campaign.isCombinable,
    usageLimitTotal:
      campaign.usageLimitTotal === null ? '' : String(campaign.usageLimitTotal),
    usageLimitPerUser:
      campaign.usageLimitPerUser === null
        ? ''
        : String(campaign.usageLimitPerUser),
    startsAt: toDateTimeLocal(campaign.startsAt),
    endsAt: toDateTimeLocal(campaign.endsAt),
  };
}

export function validatePromotionCampaignForm(
  values: ListingPromotionCampaignFormValues,
): {
  data?: ListingPromotionCampaignFormValues;
  errors: ListingPromotionCampaignFormErrors;
} {
  const parsed = campaignFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };
  return { errors: collectErrors(parsed.error.issues) };
}

export function validatePromotionCodeForm(
  values: ListingPromotionCodeFormValues,
): {
  data?: ListingPromotionCodeFormValues;
  errors: ListingPromotionCodeFormErrors;
} {
  const parsed = codeFormSchema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: {} };
  return { errors: collectErrors(parsed.error.issues) };
}

export function toCreatePromotionCampaignInput(
  values: ListingPromotionCampaignFormValues,
) {
  const parsed = campaignFormSchema.parse(values);
  return toPromotionCampaignInput(parsed, true);
}

export function toUpdatePromotionCampaignInput(
  values: ListingPromotionCampaignFormValues,
) {
  const parsed = campaignFormSchema.parse(values);
  const input = toPromotionCampaignInput(parsed, false);
  return input;
}

export function toCreatePromotionCodeInput(
  values: ListingPromotionCodeFormValues,
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
    ...(parsed.isCombinable === 'inherit'
      ? {}
      : { isCombinable: parsed.isCombinable === 'true' }),
    ...nullableInteger('usageLimitTotal', parsed.usageLimitTotal),
    ...nullableInteger('usageLimitPerUser', parsed.usageLimitPerUser),
    ...nullableDate('startsAt', parsed.startsAt),
    ...nullableDate('endsAt', parsed.endsAt),
  };
}

export function fetchAdminListingPromotions():
  Promise<AdminListingPromotionCampaign[]> {
  return apiFetch<AdminListingPromotionCampaign[]>(
    '/admin/listing-promotions',
  );
}

export function createAdminListingPromotionCampaign(
  input: ReturnType<typeof toCreatePromotionCampaignInput>,
): Promise<AdminListingPromotionCampaign> {
  return apiFetch<AdminListingPromotionCampaign>(
    '/admin/listing-promotions',
    { method: 'POST', body: input },
  );
}

export function updateAdminListingPromotionCampaign(
  code: string,
  input: Partial<ReturnType<typeof toUpdatePromotionCampaignInput>>,
): Promise<AdminListingPromotionCampaign> {
  return apiFetch<AdminListingPromotionCampaign>(
    `/admin/listing-promotions/${encodeURIComponent(code)}`,
    { method: 'PATCH', body: input },
  );
}

export function archiveAdminListingPromotionCampaign(
  code: string,
): Promise<AdminListingPromotionCampaign> {
  return apiFetch<AdminListingPromotionCampaign>(
    `/admin/listing-promotions/${encodeURIComponent(code)}/archive`,
    { method: 'POST' },
  );
}

export function restoreAdminListingPromotionCampaign(
  code: string,
): Promise<AdminListingPromotionCampaign> {
  return apiFetch<AdminListingPromotionCampaign>(
    `/admin/listing-promotions/${encodeURIComponent(code)}/restore`,
    { method: 'POST' },
  );
}

export function createAdminListingPromotionCode(
  campaignCode: string,
  input: ReturnType<typeof toCreatePromotionCodeInput>,
): Promise<AdminListingPromotionCampaign> {
  return apiFetch<AdminListingPromotionCampaign>(
    `/admin/listing-promotions/${encodeURIComponent(campaignCode)}/codes`,
    { method: 'POST', body: input },
  );
}

function toPromotionCampaignInput(
  parsed: ListingPromotionCampaignFormValues,
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
    isAutomatic: parsed.isAutomatic,
    isCombinable: parsed.isCombinable,
    ...nullableInteger('usageLimitTotal', parsed.usageLimitTotal),
    ...nullableInteger('usageLimitPerUser', parsed.usageLimitPerUser),
    ...nullableDate('startsAt', parsed.startsAt),
    ...nullableDate('endsAt', parsed.endsAt),
  };
}

function validateDiscountValue(
  value:
    | ListingPromotionCampaignFormValues
    | ListingPromotionCodeFormValues,
  context: z.RefinementCtx,
) {
  const source =
    value.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? value.discountPercent
      : value.discountGrossPln;
  const schema =
    value.discountType === ListingPromotionDiscountType.PERCENTAGE
      ? percentageSchema
      : optionalMoneyInputSchema.refine((input) => input !== '', 'Podaj kwotę');
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    context.addIssue({
      code: 'custom',
      path: [
        value.discountType === ListingPromotionDiscountType.PERCENTAGE
          ? 'discountPercent'
          : 'discountGrossPln',
      ],
      message: parsed.error.issues[0]?.message ?? 'Nieprawidłowy rabat',
    });
  }
}

function validateTargetRules(
  value: ListingPromotionCampaignFormValues,
  context: z.RefinementCtx,
) {
  if (
    value.targetScope === ListingPromotionTargetScope.PRODUCT_TYPES &&
    !value.productTypes.length
  ) {
    context.addIssue({
      code: 'custom',
      path: ['productTypes'],
      message: 'Wybierz co najmniej jeden typ produktu',
    });
  }
  if (value.targetScope !== ListingPromotionTargetScope.PRODUCT_CODES) return;
  if (!splitCodes(value.productCodes).length) {
    context.addIssue({
      code: 'custom',
      path: ['productCodes'],
      message: 'Podaj co najmniej jeden kod produktu',
    });
  }
}

function validateDateRange(
  value:
    | ListingPromotionCampaignFormValues
    | ListingPromotionCodeFormValues,
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
    | ListingPromotionCampaignFormValues
    | ListingPromotionCodeFormValues,
): number {
  return value.discountType === ListingPromotionDiscountType.PERCENTAGE
    ? decimalToInteger(value.discountPercent, 2)
    : decimalToInteger(value.discountGrossPln, 2);
}

function buildTargetRules(
  value: ListingPromotionCampaignFormValues,
): ListingPromotionTargetRules {
  const minimumSubtotal = nullableMoneyValue(value.minimumSubtotalGrossPln);
  const minimumRule =
    minimumSubtotal === null
      ? {}
      : { minimumSubtotalGrossAmount: minimumSubtotal };

  if (value.targetScope === ListingPromotionTargetScope.ALL_PRODUCTS) {
    return minimumRule;
  }
  if (value.targetScope === ListingPromotionTargetScope.PRODUCT_TYPES) {
    return { productTypes: value.productTypes, ...minimumRule };
  }
  return { productCodes: splitCodes(value.productCodes), ...minimumRule };
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

function splitCodes(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
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
