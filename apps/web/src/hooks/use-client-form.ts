'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { z } from 'zod';
import { getApiErrorMessage } from '@/lib/api-client';

interface FieldError {
  field: string;
  message: string;
}

interface UseClientFormOptions<T extends z.ZodType> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void>;
}

/**
 * Lightweight form hook with Zod validation for client forms.
 * Handles nested objects (preference.*) from FormData.
 */
export function useClientForm<T extends z.ZodType>({
  schema,
  onSubmit,
}: UseClientFormOptions<T>) {
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
      const raw = formDataToNestedObject(formData);

      const result = schema.safeParse(raw);

      if (!result.success) {
        setErrors(
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        );
        return;
      }

      setIsLoading(true);
      try {
        await onSubmit(result.data as z.infer<T>);
      } catch (err: unknown) {
        setGlobalError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [schema, onSubmit],
  );

  return { handleSubmit, getFieldError, globalError, isLoading };
}

/**
 * Converts flat FormData keys like "preference.preferredCity" into nested objects.
 */
function formDataToNestedObject(
  formData: FormData,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}
