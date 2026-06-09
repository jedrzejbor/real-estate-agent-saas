'use client';

import {
  useMemo,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import { KeyRound, Save, ShieldAlert, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  changeMyPassword,
  changeMyPasswordSchema,
  deactivateMyAccount,
  deactivateMyAccountSchema,
  updateMyProfile,
  updateMyProfileSchema,
  type ChangeMyPasswordPayload,
  type DeactivateMyAccountPayload,
  type UpdateMyProfilePayload,
} from '@/lib/account';

type FieldErrors = Record<string, string>;

interface ValidationIssue {
  path: Array<string | number | symbol>;
  message: string;
}

function getFormData(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    Array.from(new FormData(form).entries()).map(([key, value]) => [
      key,
      String(value),
    ]),
  );
}

function getFieldErrors(error: unknown): FieldErrors {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues)
  ) {
    return Object.fromEntries(
      error.issues.map((issue: ValidationIssue) => [
        String(issue.path[0] ?? ''),
        String(issue.message),
      ]),
    );
  }

  return {};
}

function SettingsField({
  label,
  name,
  error,
  className,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        aria-invalid={!!error}
        className="mt-1 h-10 rounded-xl"
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SettingsTextarea({
  label,
  name,
  error,
  className,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & ComponentProps<'textarea'>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        aria-invalid={!!error}
        className="mt-1 min-h-28 w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-muted p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AccountProfileSection() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const profileDefaults = useMemo(
    () => ({
      firstName: user?.agent?.firstName ?? '',
      lastName: user?.agent?.lastName ?? '',
      phone: user?.agent?.phone ?? '',
      licenseNo: user?.agent?.licenseNo ?? '',
      bio: user?.agent?.bio ?? '',
    }),
    [user],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const result = updateMyProfileSchema.safeParse(
      getFormData(event.currentTarget),
    );

    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }

    setIsSaving(true);
    try {
      await updateMyProfile(result.data as UpdateMyProfilePayload);
      await refreshUser();
      toast.success({
        title: 'Profil zaktualizowany',
        description: 'Dane w panelu zostały odświeżone.',
      });
    } catch (error) {
      toast.error({
        title: 'Nie udało się zapisać profilu',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      icon={UserRound}
      title="Konto"
      description="Dane widoczne w panelu oraz na publicznym profilu agenta."
    >
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <SettingsField
          label="Imię"
          name="firstName"
          defaultValue={profileDefaults.firstName}
          autoComplete="given-name"
          error={errors.firstName}
        />
        <SettingsField
          label="Nazwisko"
          name="lastName"
          defaultValue={profileDefaults.lastName}
          autoComplete="family-name"
          error={errors.lastName}
        />
        <SettingsField
          label="Telefon"
          name="phone"
          type="tel"
          defaultValue={profileDefaults.phone}
          autoComplete="tel"
          error={errors.phone}
        />
        <SettingsField
          label="Numer licencji"
          name="licenseNo"
          defaultValue={profileDefaults.licenseNo}
          error={errors.licenseNo}
        />
        <SettingsTextarea
          label="Bio"
          name="bio"
          defaultValue={profileDefaults.bio}
          error={errors.bio}
          className="lg:col-span-2"
        />
        <div className="flex justify-end lg:col-span-2">
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Zapisywanie' : 'Zapisz profil'}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

export function AccountSecuritySection() {
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const form = event.currentTarget;
    const result = changeMyPasswordSchema.safeParse(getFormData(form));

    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }

    const payload: ChangeMyPasswordPayload = {
      currentPassword: result.data.currentPassword,
      newPassword: result.data.newPassword,
    };

    setIsSaving(true);
    try {
      await changeMyPassword(payload);
      form.reset();
      toast.success({
        title: 'Hasło zmienione',
        description: 'Przy kolejnym logowaniu użyj nowego hasła.',
      });
    } catch (error) {
      toast.error({
        title: 'Nie udało się zmienić hasła',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      icon={KeyRound}
      title="Bezpieczeństwo"
      description="Zmień hasło bez wylogowywania aktywnej sesji."
    >
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
        <SettingsField
          label="Obecne hasło"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <SettingsField
          label="Nowe hasło"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <SettingsField
          label="Powtórz nowe hasło"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
        <div className="flex justify-end lg:col-span-3">
          <Button type="submit" disabled={isSaving}>
            <KeyRound className="h-4 w-4" />
            {isSaving ? 'Zapisywanie' : 'Zmień hasło'}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

export function AccountDangerZoneSection() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = user?.role === 'admin';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    if (isAdmin) return;

    const result = deactivateMyAccountSchema.safeParse(
      getFormData(event.currentTarget),
    );

    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }

    setIsSaving(true);
    try {
      await deactivateMyAccount(result.data as DeactivateMyAccountPayload);
      toast.success({
        title: 'Konto dezaktywowane',
        description: 'Sesja została zakończona.',
      });
      logout();
    } catch (error) {
      toast.error({
        title: 'Nie udało się dezaktywować konta',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      icon={ShieldAlert}
      title="Strefa ryzyka"
      description="Dezaktywacja blokuje dostęp do konta i wymaga kontaktu z administracją, aby je przywrócić."
    >
      {isAdmin ? (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
          Konto administratora nie może zostać dezaktywowane z poziomu
          aplikacji.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <SettingsField
            label="Hasło"
            name="password"
            type="password"
            autoComplete="current-password"
            error={errors.password}
          />
          <SettingsField
            label="Potwierdzenie"
            name="confirmation"
            placeholder="USUŃ KONTO"
            error={errors.confirmation}
          />
          <div className="flex justify-end lg:col-span-2">
            <Button type="submit" variant="destructive" disabled={isSaving}>
              <ShieldAlert className="h-4 w-4" />
              {isSaving ? 'Dezaktywowanie' : 'Dezaktywuj konto'}
            </Button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}
