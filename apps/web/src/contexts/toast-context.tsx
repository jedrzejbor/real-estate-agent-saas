'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X, CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  success: (input: Omit<ToastInput, 'variant'>) => string;
  error: (input: Omit<ToastInput, 'variant'>) => string;
  warning: (input: Omit<ToastInput, 'variant'>) => string;
  info: (input: Omit<ToastInput, 'variant'>) => string;
}

const DEFAULT_DURATION = 4000;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_STYLES: Record<ToastVariant, { icon: typeof Info; iconClass: string }> = {
  info: {
    icon: Info,
    iconClass: 'text-sky-600',
  },
  success: {
    icon: CircleCheck,
    iconClass: 'text-emerald-600',
  },
  warning: {
    icon: TriangleAlert,
    iconClass: 'text-amber-600',
  },
  error: {
    icon: CircleAlert,
    iconClass: 'text-destructive',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIds = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ variant = 'info', duration = DEFAULT_DURATION, ...input }: ToastInput) => {
      const id = crypto.randomUUID();
      const toast: ToastItem = {
        id,
        variant,
        duration,
        ...input,
      };

      setToasts((current) => [...current, toast]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      timeoutIds.current.set(id, timeoutId);
      return id;
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      success: (input) => showToast({ ...input, variant: 'success' }),
      error: (input) => showToast({ ...input, variant: 'error' }),
      warning: (input) => showToast({ ...input, variant: 'warning' }),
      info: (input) => showToast({ ...input, variant: 'info' }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const { icon: Icon, iconClass } = TOAST_STYLES[toast.variant ?? 'info'];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-2xl border border-border bg-white/95 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in-0"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-full bg-muted p-1.5">
                  <Icon className={cn('h-4 w-4', iconClass)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Zamknij powiadomienie"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within <ToastProvider>');
  }

  return context;
}
