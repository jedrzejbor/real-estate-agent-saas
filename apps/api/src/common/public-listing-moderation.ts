import { BadRequestException } from '@nestjs/common';
import { ListingPublicationStatus, ListingStatus } from './enums';
import { inspectPublicText } from './abuse-protection';

const REVIEW_RISK_THRESHOLD = 50;
const MIN_SALE_PRICE_PER_M2 = 1000;

export interface PublicListingModerationInput {
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  areaM2?: number | string | null;
  transactionType?: string | null;
  imageUrls?: string[];
  storedAbuse?: {
    riskScore?: unknown;
    signals?: unknown;
  } | null;
}

export interface PublicListingModerationResult {
  reviewRequired: boolean;
  riskScore: number;
  reasons: string[];
  evaluatedAt: string;
}

export function evaluatePublicListingModeration(
  input: PublicListingModerationInput,
): PublicListingModerationResult {
  const textReport = inspectPublicText({
    title: input.title,
    description: input.description,
    imageUrls: input.imageUrls,
  });
  const reasons = new Set<string>([
    ...normalizeSignals(input.storedAbuse?.signals),
    ...textReport.signals,
  ]);
  const storedRiskScore = normalizeRiskScore(input.storedAbuse?.riskScore);
  const priceRiskScore = inspectPriceRisk(input, reasons);
  const riskScore = Math.min(
    Math.max(storedRiskScore, textReport.riskScore) + priceRiskScore,
    100,
  );

  return {
    reviewRequired:
      riskScore >= REVIEW_RISK_THRESHOLD ||
      reasons.has('suspicious_terms') ||
      reasons.has('very_low_price_per_m2'),
    riskScore,
    reasons: [...reasons],
    evaluatedAt: new Date().toISOString(),
  };
}

export function assertPublicListingModerationPassed(
  input: PublicListingModerationInput,
): PublicListingModerationResult {
  const moderation = evaluatePublicListingModeration(input);

  if (moderation.reviewRequired) {
    throw new BadRequestException(
      'Oferta wymaga sprawdzenia przed publikacją. Popraw opis, cenę albo zdjęcia i spróbuj ponownie.',
    );
  }

  return moderation;
}

export function getModeratedListingState(
  moderation: PublicListingModerationResult,
): {
  status: ListingStatus;
  publicationStatus: ListingPublicationStatus;
  publishedAt?: Date;
} {
  if (moderation.reviewRequired) {
    return {
      status: ListingStatus.DRAFT,
      publicationStatus: ListingPublicationStatus.DRAFT,
    };
  }

  return {
    status: ListingStatus.ACTIVE,
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    publishedAt: new Date(),
  };
}

function inspectPriceRisk(
  input: PublicListingModerationInput,
  reasons: Set<string>,
): number {
  if (input.transactionType !== 'sale') {
    return 0;
  }

  const price = toNumber(input.price);
  const areaM2 = toNumber(input.areaM2);

  if (!price || !areaM2) {
    return 0;
  }

  if (price / areaM2 < MIN_SALE_PRICE_PER_M2) {
    reasons.add('very_low_price_per_m2');
    return 35;
  }

  return 0;
}

function normalizeRiskScore(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(Math.max(numeric, 0), 100) : 0;
}

function normalizeSignals(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((signal): signal is string => typeof signal === 'string')
    : [];
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
