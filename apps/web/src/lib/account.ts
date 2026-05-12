import { z } from 'zod';
import { apiFetch } from './api-client';
import type { AuthUser } from './auth';

// ── Validation schemas ──

export const updateMyProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Imię jest wymagane')
    .max(255, 'Imię może mieć maksymalnie 255 znaków')
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, 'Nazwisko jest wymagane')
    .max(255, 'Nazwisko może mieć maksymalnie 255 znaków')
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, 'Telefon może mieć maksymalnie 20 znaków')
    .optional(),
  licenseNo: z
    .string()
    .trim()
    .max(100, 'Numer licencji może mieć maksymalnie 100 znaków')
    .optional(),
  bio: z
    .string()
    .trim()
    .max(2000, 'Bio może mieć maksymalnie 2000 znaków')
    .optional(),
});

export const changeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Obecne hasło jest wymagane'),
    newPassword: z
      .string()
      .min(8, 'Hasło musi mieć minimum 8 znaków')
      .max(128, 'Hasło może mieć maksymalnie 128 znaków')
      .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
      .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
      .regex(/\d/, 'Hasło musi zawierać cyfrę'),
    confirmPassword: z.string().min(1, 'Powtórz nowe hasło'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Hasła muszą być takie same',
    path: ['confirmPassword'],
  });

export const deactivateMyAccountSchema = z.object({
  password: z.string().min(1, 'Hasło jest wymagane'),
  confirmation: z.literal('USUŃ KONTO', {
    error: 'Wpisz dokładnie: USUŃ KONTO',
  }),
});

// ── Types ──

export type UpdateMyProfileFormData = z.infer<typeof updateMyProfileSchema>;
export type ChangeMyPasswordFormData = z.infer<typeof changeMyPasswordSchema>;
export type DeactivateMyAccountFormData = z.infer<
  typeof deactivateMyAccountSchema
>;

export type UpdateMyProfilePayload = UpdateMyProfileFormData;

export interface ChangeMyPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type DeactivateMyAccountPayload = DeactivateMyAccountFormData;

// ── API functions ──

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me');
}

export async function updateMyProfile(
  data: UpdateMyProfilePayload,
): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me/profile', {
    method: 'PATCH',
    body: data,
  });
}

export async function changeMyPassword(
  data: ChangeMyPasswordPayload,
): Promise<void> {
  return apiFetch<void>('/auth/me/change-password', {
    method: 'POST',
    body: data,
  });
}

export async function deactivateMyAccount(
  data: DeactivateMyAccountPayload,
): Promise<void> {
  return apiFetch<void>('/auth/me', {
    method: 'DELETE',
    body: data,
  });
}
