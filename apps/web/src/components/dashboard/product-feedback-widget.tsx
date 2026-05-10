'use client';

import * as React from 'react';
import { Bug, Lightbulb, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackSource,
  ProductFeedbackType,
  submitProductFeedback,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
  type ProductFeedbackPriority as ProductFeedbackPriorityValue,
  type ProductFeedbackType as ProductFeedbackTypeValue,
} from '@/lib/product-feedback';
import { cn } from '@/lib/utils';

const FEEDBACK_TYPE_OPTIONS = [
  {
    value: ProductFeedbackType.BUG_REPORT,
    label: 'Błąd',
    icon: Bug,
  },
  {
    value: ProductFeedbackType.FEATURE_REQUEST,
    label: 'Nowa funkcja',
    icon: Lightbulb,
  },
  {
    value: ProductFeedbackType.IMPROVEMENT,
    label: 'Usprawnienie',
    icon: MessageSquare,
  },
  {
    value: ProductFeedbackType.GENERAL_FEEDBACK,
    label: 'Opinia',
    icon: MessageSquare,
  },
] as const;

const CATEGORY_OPTIONS: Array<{
  value: ProductFeedbackCategoryValue;
  label: string;
}> = [
  { value: ProductFeedbackCategory.LISTINGS, label: 'Oferty' },
  { value: ProductFeedbackCategory.CLIENTS, label: 'Klienci' },
  { value: ProductFeedbackCategory.CALENDAR, label: 'Kalendarz' },
  { value: ProductFeedbackCategory.REPORTS, label: 'Raporty' },
  { value: ProductFeedbackCategory.PUBLIC_CATALOG, label: 'Katalog publiczny' },
  { value: ProductFeedbackCategory.ONBOARDING, label: 'Onboarding' },
  { value: ProductFeedbackCategory.INTEGRATIONS, label: 'Integracje' },
  { value: ProductFeedbackCategory.UI_UX, label: 'UI / UX' },
  { value: ProductFeedbackCategory.OTHER, label: 'Inne' },
];

const PRIORITY_OPTIONS: Array<{
  value: ProductFeedbackPriorityValue;
  label: string;
}> = [
  { value: ProductFeedbackPriority.LOW, label: 'Niski' },
  { value: ProductFeedbackPriority.MEDIUM, label: 'Średni' },
  { value: ProductFeedbackPriority.HIGH, label: 'Wysoki' },
  { value: ProductFeedbackPriority.CRITICAL, label: 'Krytyczny' },
];

export function ProductFeedbackWidget() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [type, setType] = React.useState<ProductFeedbackTypeValue>(
    ProductFeedbackType.GENERAL_FEEDBACK,
  );
  const [category, setCategory] = React.useState<ProductFeedbackCategoryValue>(
    ProductFeedbackCategory.OTHER,
  );
  const [priority, setPriority] = React.useState<ProductFeedbackPriorityValue>(
    ProductFeedbackPriority.MEDIUM,
  );
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function resetForm() {
    setType(ProductFeedbackType.GENERAL_FEEDBACK);
    setCategory(ProductFeedbackCategory.OTHER);
    setPriority(ProductFeedbackPriority.MEDIUM);
    setTitle('');
    setDescription('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      showErrorToast({
        title: 'Uzupełnij zgłoszenie',
        description:
          'Dodaj krótki tytuł i opis, żebyśmy mogli zrozumieć temat.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitProductFeedback({
        type,
        category,
        userPriority: priority,
        title: trimmedTitle,
        description: trimmedDescription,
        source: ProductFeedbackSource.DASHBOARD,
        ...getFeedbackContext(),
      });

      showSuccessToast({
        title: 'Dziękujemy za feedback',
        description: 'Zgłoszenie trafiło do listy do przejrzenia.',
      });
      resetForm();
      setIsOpen(false);
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się wysłać feedbacku',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden gap-2 rounded-xl md:inline-flex"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-xl md:hidden"
        aria-label="Wyślij feedback"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/30 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-xl items-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-feedback-title"
              className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">
                    Feedback produktowy
                  </p>
                  <h2
                    id="product-feedback-title"
                    className="mt-1 font-heading text-xl font-semibold"
                  >
                    Powiedz nam, co poprawić
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Zgłoś błąd, zaproponuj funkcję albo opisz, co było niejasne.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Zamknij feedback"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-5">
                <div className="grid gap-2 sm:grid-cols-4">
                  {FEEDBACK_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = option.value === type;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-white text-foreground hover:bg-muted',
                        )}
                        onClick={() => setType(option.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Obszar"
                    value={category}
                    onChange={(value) =>
                      setCategory(value as ProductFeedbackCategoryValue)
                    }
                    options={CATEGORY_OPTIONS}
                  />
                  <SelectField
                    label="Priorytet"
                    value={priority}
                    onChange={(value) =>
                      setPriority(value as ProductFeedbackPriorityValue)
                    }
                    options={PRIORITY_OPTIONS}
                  />
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Tytuł
                  </span>
                  <Input
                    value={title}
                    maxLength={160}
                    placeholder="np. Nie mogę opublikować oferty"
                    className="h-10 rounded-xl"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Opis
                  </span>
                  <textarea
                    value={description}
                    maxLength={5000}
                    rows={6}
                    placeholder="Opisz, co się stało, czego oczekujesz albo jakiej funkcji brakuje."
                    className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <span className="block text-xs text-muted-foreground">
                    Nie wklejaj danych wrażliwych klientów. Aktualny adres
                    strony dodamy automatycznie.
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={isSubmitting}
                    onClick={() => setIsOpen(false)}
                  >
                    Anuluj
                  </Button>
                  <Button
                    type="submit"
                    className="gap-2 rounded-xl"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Wyślij feedback
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        className="h-10 w-full rounded-xl border border-border/80 bg-white px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getFeedbackContext() {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    sourceUrl: `${window.location.pathname}${window.location.search}`,
    module: inferDashboardModule(window.location.pathname),
    browser: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}

function inferDashboardModule(pathname: string): string {
  const [, dashboard, module] = pathname.split('/');

  if (dashboard !== 'dashboard') {
    return 'dashboard';
  }

  return module || 'dashboard';
}
