'use client';

import { useState, useCallback, type FormEvent } from 'react';
import type { z } from 'zod';

interface UseAuthFormOptions<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void>;
}

interface FieldError {
  field: string;
  message: string;
}

/**
 * Lightweight form hook with Zod validation.
 * Avoids heavy dependencies like react-hook-form for simple auth forms.
 */
export function useAuthForm<T extends z.ZodObject<z.ZodRawShape>>({
  schema,
  onSubmit,
}: UseAuthFormOptions<T>) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getFieldError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message ?? null,
    [errors],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors([]);
      setGlobalError(null);

      const formData = new FormData(e.currentTarget);
      const raw = Object.fromEntries(formData.entries());

      const result = schema.safeParse(raw);

      if (!result.success) {
        setErrors(
          result.error.issues.map((issue) => ({
            field: String(issue.path[0]),
            message: issue.message,
          })),
        );
        return;
      }

      setIsLoading(true);
      try {
        await onSubmit(result.data as z.infer<T>);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd';
        setGlobalError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [schema, onSubmit],
  );

  return { handleSubmit, getFieldError, globalError, isLoading };
}
