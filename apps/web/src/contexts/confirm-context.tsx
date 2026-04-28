'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleAlert, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmDialogState extends Required<ConfirmOptions> {
  open: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

const DEFAULT_STATE: ConfirmDialogState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Potwierdź',
  cancelLabel: 'Anuluj',
  variant: 'default',
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmDialogState>(DEFAULT_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(DEFAULT_STATE);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    setDialog({
      open: true,
      title: options.title,
      description: options.description ?? '',
      confirmLabel: options.confirmLabel ?? 'Potwierdź',
      cancelLabel: options.cancelLabel ?? 'Anuluj',
      variant: options.variant ?? 'default',
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!dialog.open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDialog, dialog.open]);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const value = useMemo<ConfirmContextValue>(
    () => ({ confirm }),
    [confirm],
  );

  const isDestructive = dialog.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog.open ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            aria-label="Zamknij modal"
            onClick={() => closeDialog(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => closeDialog(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Zamknij okno"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  isDestructive ? 'bg-destructive/10' : 'bg-primary/10',
                )}
              >
                {isDestructive ? (
                  <TriangleAlert className="h-5 w-5 text-destructive" />
                ) : (
                  <CircleAlert className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {dialog.title}
                </h2>
                {dialog.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {dialog.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => closeDialog(false)}
              >
                {dialog.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={isDestructive ? 'destructive' : 'default'}
                className="rounded-xl"
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within <ConfirmProvider>');
  }

  return context;
}
