'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { loginSchema, type LoginFormData } from '@/lib/auth';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';

export default function LoginPage() {
  const { login } = useAuth();

  const { handleSubmit, getFieldError, globalError, isLoading } =
    useAuthForm<typeof loginSchema>({
      schema: loginSchema,
      onSubmit: async (data: LoginFormData) => {
        await login(data);
      },
    });

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Witaj ponownie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zaloguj się do swojego konta EstateFlow
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {globalError && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            placeholder="••••••••"
            autoComplete="current-password"
            error={getFieldError('password')}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {isLoading ? 'Logowanie…' : 'Zaloguj się'}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Nie masz konta?{' '}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Zarejestruj się
        </Link>
      </p>
    </>
  );
}
