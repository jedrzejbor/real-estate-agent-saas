'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { registerSchema, type RegisterFormData } from '@/lib/auth';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';

export default function RegisterPage() {
  const { register } = useAuth();

  const { handleSubmit, getFieldError, globalError, isLoading } =
    useAuthForm<typeof registerSchema>({
      schema: registerSchema,
      onSubmit: async (data: RegisterFormData) => {
        await register(data);
      },
    });

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Utwórz konto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rozpocznij darmowy okres próbny EstateFlow
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {globalError && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <AuthFormField
              label="Imię"
              name="firstName"
              type="text"
              placeholder="Jan"
              autoComplete="given-name"
              error={getFieldError('firstName')}
            />
            <AuthFormField
              label="Nazwisko"
              name="lastName"
              type="text"
              placeholder="Kowalski"
              autoComplete="family-name"
              error={getFieldError('lastName')}
            />
          </div>

          <AuthFormField
            label="Email"
            name="email"
            type="email"
            placeholder="jan@example.com"
            autoComplete="email"
            error={getFieldError('email')}
          />

          <AuthFormField
            label="Hasło"
            name="password"
            type="password"
            placeholder="Min. 8 znaków, wielka litera, cyfra"
            autoComplete="new-password"
            error={getFieldError('password')}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {isLoading ? 'Tworzenie konta…' : 'Zarejestruj się'}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Zaloguj się
        </Link>
      </p>
    </>
  );
}
