'use client';

import * as React from 'react';
import { Check, ClipboardList, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  FeatureSurveyQuestionType,
  fetchActiveFeatureSurveys,
  fetchActivePublicFeatureSurveys,
  submitFeatureSurveyResponse,
  submitPublicFeatureSurveyResponse,
  type FeatureSurvey,
  type FeatureSurveyQuestion,
} from '@/lib/product-feedback';
import { cn } from '@/lib/utils';

interface FeatureSurveyListProps {
  publicMode?: boolean;
  className?: string;
  emptyState?: boolean;
}

type Answers = Record<string, unknown>;

export function FeatureSurveyList({
  publicMode = false,
  className,
  emptyState = false,
}: FeatureSurveyListProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const formStartedAtRef = React.useRef(Date.now());
  const [surveys, setSurveys] = React.useState<FeatureSurvey[]>([]);
  const [answersBySurvey, setAnswersBySurvey] = React.useState<
    Record<string, Answers>
  >({});
  const [emailBySurvey, setEmailBySurvey] = React.useState<
    Record<string, string>
  >({});
  const [websiteBySurvey, setWebsiteBySurvey] = React.useState<
    Record<string, string>
  >({});
  const [submittedSurveyIds, setSubmittedSurveyIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [submittingSurveyId, setSubmittingSurveyId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadSurveys() {
      try {
        setIsLoading(true);
        const result = publicMode
          ? await fetchActivePublicFeatureSurveys()
          : await fetchActiveFeatureSurveys();
        if (isMounted) setSurveys(result);
      } catch {
        if (isMounted) setSurveys([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSurveys();

    return () => {
      isMounted = false;
    };
  }, [publicMode]);

  async function handleSubmit(survey: FeatureSurvey) {
    const answers = answersBySurvey[survey.id] ?? {};
    const missingQuestion = survey.questions.find((question) =>
      isAnswerMissing(question, answers[question.id]),
    );

    if (missingQuestion) {
      showErrorToast({
        title: 'Uzupełnij ankietę',
        description: `Brakuje odpowiedzi: ${missingQuestion.label}`,
      });
      return;
    }

    try {
      setSubmittingSurveyId(survey.id);
      const sourceUrl = getCurrentSourceUrl();

      if (publicMode) {
        await submitPublicFeatureSurveyResponse(survey.id, {
          answers,
          sourceUrl,
          email: emailBySurvey[survey.id]?.trim() || undefined,
          website: websiteBySurvey[survey.id] ?? '',
          formStartedAt: formStartedAtRef.current,
        });
      } else {
        await submitFeatureSurveyResponse(survey.id, {
          answers,
          sourceUrl,
        });
      }

      setSubmittedSurveyIds((prev) => new Set(prev).add(survey.id));
      showSuccessToast({
        title: 'Ankieta zapisana',
        description: 'Dziękujemy. Odpowiedź trafiła do feedbacku produktu.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać ankiety',
        description: getApiErrorMessage(error),
      });
    } finally {
      setSubmittingSurveyId(null);
    }
  }

  function updateAnswer(surveyId: string, questionId: string, value: unknown) {
    setAnswersBySurvey((current) => ({
      ...current,
      [surveyId]: {
        ...(current[surveyId] ?? {}),
        [questionId]: value,
      },
    }));
  }

  if (isLoading) {
    return null;
  }

  if (surveys.length === 0) {
    return emptyState ? (
      <FeatureSurveyEmptyState className={className} />
    ) : null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {surveys.map((survey) => {
        const isSubmitted = submittedSurveyIds.has(survey.id);
        const isSubmitting = submittingSurveyId === survey.id;
        const answers = answersBySurvey[survey.id] ?? {};

        return (
          <section
            key={survey.id}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  Ankieta produktowa
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
                  {survey.title}
                </h2>
                {survey.description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {survey.description}
                  </p>
                ) : null}
              </div>
              {isSubmitted ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Check className="h-4 w-4" />
                  Zapisano
                </div>
              ) : null}
            </div>

            {isSubmitted ? null : (
              <div className="mt-5 space-y-5">
                {survey.questions.map((question) => (
                  <SurveyQuestionField
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    onChange={(value) =>
                      updateAnswer(survey.id, question.id, value)
                    }
                  />
                ))}

                {publicMode ? (
                  <>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-foreground">
                        Email do kontaktu (opcjonalnie)
                      </span>
                      <Input
                        type="email"
                        value={emailBySurvey[survey.id] ?? ''}
                        placeholder="twoj@email.pl"
                        className="h-10 rounded-xl"
                        onChange={(event) =>
                          setEmailBySurvey((current) => ({
                            ...current,
                            [survey.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="hidden">
                      <label htmlFor={`survey-website-${survey.id}`}>
                        Strona internetowa
                      </label>
                      <input
                        id={`survey-website-${survey.id}`}
                        tabIndex={-1}
                        autoComplete="off"
                        value={websiteBySurvey[survey.id] ?? ''}
                        onChange={(event) =>
                          setWebsiteBySurvey((current) => ({
                            ...current,
                            [survey.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="gap-2 rounded-xl"
                    disabled={isSubmitting}
                    onClick={() => handleSubmit(survey)}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Wyślij ankietę
                  </Button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FeatureSurveyEmptyState({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-white p-8 text-center shadow-sm',
        className,
      )}
    >
      <ClipboardList className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        Brak aktywnych ankiet
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Ankiety pojawią się tutaj, gdy administrator utworzy ankietę ze statusem
        aktywnym i odbiorcami pasującymi do Twojego konta.
      </p>
    </section>
  );
}

function SurveyQuestionField({
  question,
  value,
  onChange,
}: {
  question: FeatureSurveyQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <span className="text-sm font-medium text-foreground">
      {question.label}
      {question.required ? <span className="text-destructive"> *</span> : null}
    </span>
  );

  if (question.type === FeatureSurveyQuestionType.TEXT) {
    return (
      <label className="block space-y-1.5">
        {label}
        <textarea
          value={typeof value === 'string' ? value : ''}
          rows={4}
          maxLength={2000}
          className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (question.type === FeatureSurveyQuestionType.RATING) {
    const min = question.min ?? 1;
    const max = question.max ?? 5;
    return (
      <fieldset className="space-y-2">
        {label}
        <SegmentedNumberPicker
          min={min}
          max={max}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
      </fieldset>
    );
  }

  if (question.type === FeatureSurveyQuestionType.NPS) {
    return (
      <fieldset className="space-y-2">
        {label}
        <SegmentedNumberPicker
          min={0}
          max={10}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
        />
      </fieldset>
    );
  }

  if (question.type === FeatureSurveyQuestionType.MULTIPLE_CHOICE) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-2">
        {label}
        <div className="grid gap-2 sm:grid-cols-2">
          {(question.options ?? []).map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-white text-foreground hover:bg-muted',
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value);
                    onChange(next);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-2">
      {label}
      <div className="grid gap-2 sm:grid-cols-2">
        {(question.options ?? []).map((option) => {
          const checked = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                'min-h-12 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                checked
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border bg-white text-foreground hover:bg-muted',
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SegmentedNumberPicker({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:flex sm:flex-wrap">
      {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(
        (item) => (
          <button
            key={item}
            type="button"
            className={cn(
              'h-10 min-w-10 rounded-xl border px-3 text-sm font-medium transition-colors',
              value === item
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-foreground hover:bg-muted',
            )}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
    </div>
  );
}

function isAnswerMissing(
  question: FeatureSurveyQuestion,
  value: unknown,
): boolean {
  if (!question.required) return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  return value === undefined || value === null;
}

function getCurrentSourceUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.pathname}${window.location.search}`;
}
