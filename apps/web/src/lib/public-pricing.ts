import type {
  PublicPlan,
  PublicPlanIntervalPromotionPreview,
} from './billing-plans';

export type BillingInterval = 'monthly' | 'yearly';

export function formatPlanPrice(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): string {
  if (plan.code === 'enterprise') {
    return 'Kontakt';
  }

  const price =
    getPlanPromotionPreview(plan, billingInterval)?.priceGrossAmount ??
    getPlanBasePrice(plan, billingInterval);

  if (price <= 0) {
    return '0 zł';
  }

  return formatMoney(price);
}

export function getPriceHelper(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): string {
  if (plan.code === 'enterprise') {
    return 'indywidualna oferta';
  }

  return billingInterval === 'monthly' ? 'miesięcznie' : 'rocznie';
}

export function getPlanBasePrice(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): number {
  return billingInterval === 'monthly'
    ? plan.priceMonthlyPln
    : plan.priceYearlyPln;
}

export function formatPlanBasePrice(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): string {
  return formatMoney(getPlanBasePrice(plan, billingInterval));
}

export function formatPlanMoney(value: number): string {
  return formatMoney(value);
}

export function getPlanPromotionPreview(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): PublicPlanIntervalPromotionPreview | null {
  return plan.promotionPreview?.[billingInterval] ?? null;
}

export function getPlanPromotionDurationLabel(
  preview: PublicPlanIntervalPromotionPreview,
  billingInterval: BillingInterval,
): string {
  if (preview.durationBillingCycles <= 1) {
    return billingInterval === 'monthly'
      ? 'przez pierwszy miesiąc'
      : 'przez pierwszy rok';
  }

  return billingInterval === 'monthly'
    ? `przez pierwsze ${preview.durationBillingCycles} mies.`
    : `przez pierwsze ${preview.durationBillingCycles} lata`;
}

export function getPlanHighlights(plan: PublicPlan): string[] {
  const highlights = [
    `${formatLimit(plan.limits.activeListings, 'ofert')} aktywnych`,
    `${formatLimit(plan.limits.clients, 'klientów')} w CRM`,
    `${formatLimit(plan.limits.monthlyAppointments, 'spotkań')} miesięcznie`,
    `${formatLimit(plan.limits.users, 'użytkowników')} w workspace`,
    `${formatLimit(plan.limits.imagesPerListing, 'zdjęć')} na ofertę`,
  ];

  if (plan.features.customBranding) {
    highlights.push('Własny branding publicznych stron');
  }
  if (plan.features.customDomain) {
    highlights.push('Własna domena');
  }
  if (plan.features.apiAccess) {
    highlights.push('Dostęp API');
  }
  if (plan.features.dedicatedSupport) {
    highlights.push('Dedykowane wsparcie');
  }

  return highlights.slice(0, 7);
}

export function getPlanFallbackDescription(plan: PublicPlan): string {
  if (plan.code === 'free') {
    return 'Start pracy z CRM, ofertami i podstawową obsługą leadów.';
  }
  if (plan.code === 'starter') {
    return 'Większe limity dla solo agentów i pierwszego realnego pipeline.';
  }
  if (plan.code === 'professional') {
    return 'Rozszerzona praca z ofertami, raportami i brandingiem.';
  }
  return 'Indywidualne warunki dla większych zespołów i wdrożeń.';
}

function formatLimit(value: number | null | undefined, noun: string): string {
  if (value === null || value === undefined) {
    return `Bez limitu ${noun}`;
  }

  return `${value.toLocaleString('pl-PL')} ${noun}`;
}

function formatMoney(value: number): string {
  const hasFraction = value % 100 !== 0;
  const absoluteValue = Math.abs(value);
  const major = Math.floor(absoluteValue / 100);
  const minor = absoluteValue % 100;
  const groupedMajor = major
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fraction = hasFraction ? `,${minor.toString().padStart(2, '0')}` : '';
  const sign = value < 0 ? '-' : '';

  return `${sign}${groupedMajor}${fraction} zł`;
}
