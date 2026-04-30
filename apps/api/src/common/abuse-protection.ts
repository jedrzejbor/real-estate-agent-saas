import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';

const DEFAULT_MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const SUSPICIOUS_TERMS = [
  'crypto',
  'bitcoin',
  'loan',
  'casino',
  'viagra',
  'forex',
  'telegram',
  'whatsapp',
  'investment',
];

export interface RequestFingerprint {
  ipHash: string | null;
  userAgent: string | null;
}

export interface AbuseSignalReport {
  riskScore: number;
  signals: string[];
}

export interface PublicFormTimingOptions {
  minCompletionMs: number;
  maxAgeMs?: number;
}

export interface PublicTextAbuseInput {
  title?: string | null;
  description?: string | null;
  message?: string | null;
  imageUrls?: string[];
}

export function assertPublicFormHoneypot(
  value: string | undefined | null,
): void {
  if (value?.trim()) {
    throw new BadRequestException('Nie udało się zapisać formularza');
  }
}

export function assertPublicFormTiming(
  formStartedAt: number | undefined,
  options: PublicFormTimingOptions,
): void {
  if (!formStartedAt) {
    return;
  }

  const elapsed = Date.now() - formStartedAt;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_FORM_AGE_MS;
  if (elapsed < options.minCompletionMs || elapsed > maxAgeMs) {
    throw new BadRequestException('Spróbuj wysłać formularz ponownie');
  }
}

export function assertPublicTextAllowed(
  input: PublicTextAbuseInput,
  options: { maxLinks: number },
): AbuseSignalReport {
  const report = inspectPublicText(input, options);

  if (report.signals.includes('too_many_links')) {
    throw new BadRequestException(
      `Formularz może zawierać maksymalnie ${options.maxLinks} linki`,
    );
  }

  return report;
}

export function inspectPublicText(
  input: PublicTextAbuseInput,
  options: { maxLinks?: number } = {},
): AbuseSignalReport {
  const signals = new Set<string>();
  const maxLinks = options.maxLinks ?? 2;
  const text = [input.title, input.description, input.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const linkCount = countLinks(text);

  if (linkCount > maxLinks) {
    signals.add('too_many_links');
  } else if (linkCount > 0) {
    signals.add('contains_links');
  }

  if (/(.)\1{12,}/.test(text)) {
    signals.add('repeated_characters');
  }

  if (SUSPICIOUS_TERMS.some((term) => text.includes(term))) {
    signals.add('suspicious_terms');
  }

  if ((input.description?.trim().length ?? 0) < 40) {
    signals.add('short_description');
  }

  if ((input.imageUrls?.filter(Boolean).length ?? 0) === 0) {
    signals.add('missing_images');
  }

  const riskScore = calculateRiskScore(signals);
  return { riskScore, signals: [...signals] };
}

export function getRequestFingerprint(request: Request): RequestFingerprint {
  return {
    ipHash: hashIp(getClientIp(request)),
    userAgent: normalizeOptional(request.get('user-agent')),
  };
}

export function assertRateLimit(
  currentUsage: number,
  limit: number,
  message = 'Zbyt wiele prób. Spróbuj ponownie później.',
): void {
  if (currentUsage >= limit) {
    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export function normalizeContactFingerprint(
  value: string | undefined | null,
): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized
    ? createHash('sha256').update(normalized).digest('hex')
    : null;
}

export function normalizeOptional(
  value: string | undefined | null,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function calculateRiskScore(signals: Set<string>): number {
  let score = 0;
  if (signals.has('contains_links')) score += 15;
  if (signals.has('too_many_links')) score += 60;
  if (signals.has('repeated_characters')) score += 25;
  if (signals.has('suspicious_terms')) score += 35;
  if (signals.has('short_description')) score += 10;
  if (signals.has('missing_images')) score += 10;
  return Math.min(score, 100);
}

function countLinks(value: string): number {
  return value.match(URL_PATTERN)?.length ?? 0;
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.ip || null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex');
}
