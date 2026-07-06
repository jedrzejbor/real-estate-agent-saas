import { CheckCircle2, Circle, MailCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PublicListingSubmissionStage =
  | 'form'
  | 'email'
  | 'review'
  | 'publication';

interface PublicListingSubmissionProcessProps {
  currentStage: PublicListingSubmissionStage;
  className?: string;
}

const PROCESS_STEPS: Array<{
  stage: PublicListingSubmissionStage;
  label: string;
  description: string;
}> = [
  {
    stage: 'form',
    label: 'Dane',
    description: 'Uzupełniasz ofertę i kontakt.',
  },
  {
    stage: 'email',
    label: 'Email',
    description: 'Potwierdzasz adres z linku.',
  },
  {
    stage: 'review',
    label: 'Weryfikacja',
    description: 'Sprawdzamy jakość i bezpieczeństwo.',
  },
  {
    stage: 'publication',
    label: 'Publikacja',
    description: 'Oferta może trafić do katalogu.',
  },
];

const STAGE_ORDER = PROCESS_STEPS.map((step) => step.stage);

export function PublicListingSubmissionProcess({
  currentStage,
  className,
}: PublicListingSubmissionProcessProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <section
      aria-label="Proces dodawania publicznej oferty"
      className={cn(
        'rounded-2xl border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <div className="grid gap-2 sm:grid-cols-4">
        {PROCESS_STEPS.map((step, index) => {
          const state =
            index < currentIndex
              ? 'complete'
              : index === currentIndex
                ? 'current'
                : 'upcoming';
          const Icon =
            state === 'complete'
              ? CheckCircle2
              : step.stage === 'email'
                ? MailCheck
                : step.stage === 'review'
                  ? ShieldCheck
                  : Circle;

          return (
            <div
              key={step.stage}
              className={cn(
                'flex min-w-0 gap-3 rounded-xl border px-3 py-3',
                state === 'complete'
                  ? 'border-status-success/25 bg-status-success-bg'
                  : state === 'current'
                    ? 'border-primary/25 bg-primary/5'
                    : 'border-border bg-muted/20',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  state === 'complete'
                    ? 'bg-status-success text-white'
                    : state === 'current'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    state === 'upcoming'
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                  )}
                >
                  {index + 1}. {step.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
