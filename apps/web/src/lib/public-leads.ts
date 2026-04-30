import { z } from 'zod';
import { apiFetch } from './api-client';

export const PublicLeadSource = {
  PUBLIC_LISTING_PAGE: 'public_listing_page',
  PUBLIC_LISTING_SHARE: 'public_listing_share',
  QR_CODE: 'qr_code',
  EMBED: 'embed',
  OTHER: 'other',
} as const;

export type PublicLeadSource =
  (typeof PublicLeadSource)[keyof typeof PublicLeadSource];

export const publicLeadFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Imię i nazwisko są wymagane')
      .max(255, 'Imię i nazwisko może mieć maksymalnie 255 znaków'),
    email: z
      .string()
      .trim()
      .email('Podaj poprawny adres email')
      .max(255)
      .optional()
      .or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(3000).optional().or(z.literal('')),
    contactConsent: z.literal(true, {
      message: 'Zgoda na kontakt jest wymagana',
    }),
    marketingConsent: z.boolean().optional(),
    website: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Podaj email albo numer telefonu',
      });
    }
  });

export type PublicLeadFormData = z.infer<typeof publicLeadFormSchema>;

export interface CreatePublicLeadInput extends PublicLeadFormData {
  source: PublicLeadSource;
  sourceUrl: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  formStartedAt: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface PublicLeadSubmissionResult {
  id: string;
  status: string;
  createdAt: string;
}

export async function submitPublicLead(
  slug: string,
  input: CreatePublicLeadInput,
): Promise<PublicLeadSubmissionResult> {
  return apiFetch<PublicLeadSubmissionResult>(
    `/public-leads/listings/${slug}`,
    {
      method: 'POST',
      skipAuth: true,
      body: cleanPublicLeadPayload(input),
    },
  );
}

function cleanPublicLeadPayload(
  input: CreatePublicLeadInput,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
