'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bug,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { APP_NAME } from '@/lib/brand';
import {
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackSource,
  ProductFeedbackType,
  submitPublicProductFeedback,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
  type ProductFeedbackSource as ProductFeedbackSourceValue,
  type ProductFeedbackType as ProductFeedbackTypeValue,
} from '@/lib/product-feedback';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS = [
  {
    value: ProductFeedbackType.BUG_REPORT,
    label: 'Zgłoś błąd',
    description: 'Coś nie działa albo wygląda niepoprawnie.',
    icon: Bug,
  },
  {
    value: ProductFeedbackType.FEATURE_REQUEST,
    label: 'Zaproponuj funkcję',
    description: `Brakuje Ci czegoś w ${APP_NAME}.`,
    icon: Lightbulb,
  },
  {
    value: ProductFeedbackType.IMPROVEMENT,
    label: 'Usprawnienie',
    description: 'Coś można uprościć albo poprawić.',
    icon: Wrench,
  },
  {
    value: ProductFeedbackType.GENERAL_FEEDBACK,
    label: 'Opinia',
    description: 'Ogólna uwaga o produkcie lub stronie.',
    icon: MessageSquare,
  },
] as const;

const CATEGORY_OPTIONS: Array<{
  value: ProductFeedbackCategoryValue;
  label: string;
}> = [
  { value: ProductFeedbackCategory.PUBLIC_CATALOG, label: 'Katalog ofert' },
  {
    value: ProductFeedbackCategory.PUBLIC_LISTING_SUBMISSION,
    label: 'Dodawanie oferty',
  },
  { value: ProductFeedbackCategory.LISTINGS, label: 'Oferty' },
  { value: ProductFeedbackCategory.ONBOARDING, label: 'Onboarding' },
  { value: ProductFeedbackCategory.BILLING, label: 'Cennik / płatności' },
  { value: ProductFeedbackCategory.UI_UX, label: 'Wygląd i użyteczność' },
  { value: ProductFeedbackCategory.OTHER, label: 'Inne' },
];

const PUBLIC_SOURCE_VALUES = new Set<string>([
  ProductFeedbackSource.PUBLIC_CATALOG,
  ProductFeedbackSource.PUBLIC_LISTING,
  ProductFeedbackSource.PUBLIC_FORM,
  ProductFeedbackSource.HOMEPAGE,
  ProductFeedbackSource.ERROR_PAGE,
]);

export function PublicProductFeedbackForm() {
  const searchParams = useSearchParams();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const formStartedAtRef = React.useRef(Date.now());
  const [type, setType] = React.useState<ProductFeedbackTypeValue>(
    ProductFeedbackType.GENERAL_FEEDBACK,
  );
  const [category, setCategory] = React.useState<ProductFeedbackCategoryValue>(
    ProductFeedbackCategory.OTHER,
  );
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedId, setSubmittedId] = React.useState<string | null>(null);

  const source = getPublicFeedbackSource(searchParams.get('source'));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      showErrorToast({
        title: 'Uzupełnij zgłoszenie',
        description:
          'Dodaj tytuł i opis, żebyśmy mogli dobrze zrozumieć temat.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await submitPublicProductFeedback({
        type,
        category,
        userPriority: ProductFeedbackPriority.MEDIUM,
        title: trimmedTitle,
        description: trimmedDescription,
        email: email.trim() || undefined,
        website,
        formStartedAt: formStartedAtRef.current,
        source,
        ...getPublicFeedbackContext(),
      });

      setSubmittedId(result.id);
      setTitle('');
      setDescription('');
      setEmail('');
      setWebsite('');
      showSuccessToast({
        title: 'Dziękujemy za feedback',
        description:
          'Zapisaliśmy zgłoszenie i przejrzymy je przy triage produktu.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się wysłać feedbacku',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-heading text-2xl font-semibold">
          Feedback zapisany
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
          Dziękujemy. Twoje zgłoszenie trafiło do listy do przejrzenia. Jeśli
          podałeś email, możemy odezwać się z pytaniem doprecyzowującym.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Identyfikator zgłoszenia: {submittedId}
        </p>
        <Button
          type="button"
          className="mt-6 rounded-xl"
          onClick={() => {
            setSubmittedId(null);
            formStartedAtRef.current = Date.now();
          }}
        >
          Wyślij kolejne zgłoszenie
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === type;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                'min-h-28 rounded-xl border p-4 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-muted',
              )}
              onClick={() => setType(option.value)}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="mt-3 block text-sm font-semibold text-foreground">
                {option.label}
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Obszar</span>
          <select
            value={category}
            className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) =>
              setCategory(event.target.value as ProductFeedbackCategoryValue)
            }
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            Email do kontaktu (opcjonalnie)
          </span>
          <Input
            type="email"
            value={email}
            placeholder="twoj@email.pl"
            className="h-10 rounded-xl"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Tytuł</span>
        <Input
          value={title}
          maxLength={160}
          placeholder="np. Nie mogę znaleźć ofert z mojej okolicy"
          className="h-10 rounded-xl"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="mt-4 block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Opis</span>
        <textarea
          value={description}
          maxLength={5000}
          rows={7}
          placeholder="Opisz, co się stało, czego brakuje albo co warto poprawić."
          className="w-full resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => setDescription(event.target.value)}
        />
        <span className="block text-xs leading-5 text-muted-foreground">
          Nie wklejaj danych wrażliwych. Aktualny adres strony i podstawowy
          kontekst techniczny dodamy automatycznie.
        </span>
      </label>

      <div className="hidden">
        <label htmlFor="feedback-website">Strona internetowa</label>
        <input
          id="feedback-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        To miejsce służy do feedbacku o produkcie. Jeśli chcesz zgłosić
        naruszenie lub fałszywą ofertę, użyj przycisku zgłoszenia na stronie
        konkretnej oferty.
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Wysyłając feedback, pozwalasz nam wykorzystać go do poprawy produktu i
          ewentualnego kontaktu zwrotnego.
        </p>
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
  );
}

function getPublicFeedbackSource(
  value: string | null,
): ProductFeedbackSourceValue {
  return value && PUBLIC_SOURCE_VALUES.has(value)
    ? (value as ProductFeedbackSourceValue)
    : ProductFeedbackSource.PUBLIC_FORM;
}

function getPublicFeedbackContext() {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    sourceUrl: `${window.location.pathname}${window.location.search}`,
    browser: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}
