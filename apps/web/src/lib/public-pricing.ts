import type { PublicPlan } from './billing-plans';

export type BillingInterval = 'monthly' | 'yearly';

export function formatPlanPrice(
  plan: PublicPlan,
  billingInterval: BillingInterval,
): string {
  if (plan.code === 'enterprise') {
    return 'Kontakt';
  }

  const price =
    billingInterval === 'monthly'
      ? plan.priceMonthlyPln
      : plan.priceYearlyPln;

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
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(value / 100);
}
