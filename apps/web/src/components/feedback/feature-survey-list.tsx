'use client';

import * as React from 'react';
import {
  BarChart3,
  Check,
  ClipboardList,
  Loader2,
  Pencil,
  Send,
} from 'lucide-react';
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
  updateFeatureSurveyResponse,
  type FeatureSurvey,
  type FeatureSurveyQuestion,
  type FeatureSurveyQuestionResult,
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
  const [editingSurveyIds, setEditingSurveyIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [submittingSurveyId, setSubmittingSurveyId] = React.useState<
    string | null
  >(null);

  const loadSurveys = React.useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      try {
        if (showLoading) setIsLoading(true);
        const result = publicMode
          ? await fetchActivePublicFeatureSurveys()
          : await fetchActiveFeatureSurveys();
        setSurveys(result);
      } catch {
        if (showLoading) setSurveys([]);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [publicMode],
  );

  React.useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

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
      const isUpdating = !publicMode && !!survey.viewerResponse;

      if (publicMode) {
        await submitPublicFeatureSurveyResponse(survey.id, {
          answers,
          sourceUrl,
          email: emailBySurvey[survey.id]?.trim() || undefined,
          website: websiteBySurvey[survey.id] ?? '',
          formStartedAt: formStartedAtRef.current,
        });
      } else if (isUpdating) {
        await updateFeatureSurveyResponse(survey.id, {
          answers,
          sourceUrl,
        });
      } else {
        await submitFeatureSurveyResponse(survey.id, {
          answers,
          sourceUrl,
        });
      }

      setSubmittedSurveyIds((prev) => new Set(prev).add(survey.id));
      setEditingSurveyIds((prev) => {
        const next = new Set(prev);
        next.delete(survey.id);
        return next;
      });
      await loadSurveys({ showLoading: false });
      showSuccessToast({
        title: isUpdating ? 'Odpowiedź zaktualizowana' : 'Ankieta zapisana',
        description: isUpdating
          ? 'Wyniki ankiety zostały przeliczone.'
          : 'Dziękujemy. Odpowiedź trafiła do feedbacku produktu.',
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

  function startEditingResponse(survey: FeatureSurvey) {
    if (!survey.viewerResponse) return;

    setAnswersBySurvey((current) => ({
      ...current,
      [survey.id]: survey.viewerResponse?.answers ?? {},
    }));
    setEditingSurveyIds((current) => new Set(current).add(survey.id));
  }

  function cancelEditingResponse(surveyId: string) {
    setEditingSurveyIds((current) => {
      const next = new Set(current);
      next.delete(surveyId);
      return next;
    });
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
        const isSubmitted =
          submittedSurveyIds.has(survey.id) || !!survey.viewerResponse;
        const isEditing = editingSurveyIds.has(survey.id);
        const isSubmitting = submittingSurveyId === survey.id;
        const answers =
          answersBySurvey[survey.id] ?? survey.viewerResponse?.answers ?? {};

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
                  Oddano głos
                </div>
              ) : null}
            </div>

            {isSubmitted && !isEditing ? (
              <SurveyResults
                survey={survey}
                canEdit={!publicMode}
                onEdit={() => startEditingResponse(survey)}
              />
            ) : (
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

                <div className="flex flex-col justify-end gap-2 sm:flex-row">
                  {isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      disabled={isSubmitting}
                      onClick={() => cancelEditingResponse(survey.id)}
                    >
                      Anuluj edycję
                    </Button>
                  ) : null}
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
                    {isEditing ? 'Zapisz zmiany' : 'Wyślij ankietę'}
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

function SurveyResults({
  survey,
  canEdit,
  onEdit,
}: {
  survey: FeatureSurvey;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const results = survey.results;

  if (!results || results.responseCount === 0) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Dziękujemy za odpowiedź. Wyniki pojawią się, gdy system odświeży dane
        ankiety.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Wyniki ankiety</span>
          <span className="text-muted-foreground">
            {results.responseCount} {pluralizeResponses(results.responseCount)}
          </span>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl sm:self-start"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Edytuj odpowiedź
          </Button>
        ) : null}
      </div>

      <div className="space-y-5">
        {survey.questions.map((question) => (
          <SurveyQuestionResults
            key={question.id}
            question={question}
            result={results.questions[question.id]}
            viewerAnswer={survey.viewerResponse?.answers[question.id]}
          />
        ))}
      </div>
    </div>
  );
}

function SurveyQuestionResults({
  question,
  result,
  viewerAnswer,
}: {
  question: FeatureSurveyQuestion;
  result?: FeatureSurveyQuestionResult;
  viewerAnswer: unknown;
}) {
  if (!result) return null;

  if (
    question.type === FeatureSurveyQuestionType.SINGLE_CHOICE ||
    question.type === FeatureSurveyQuestionType.MULTIPLE_CHOICE
  ) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{question.label}</p>
        <div className="space-y-2">
          {(result.options ?? []).map((option) => {
            const isViewerAnswer = Array.isArray(viewerAnswer)
              ? viewerAnswer.includes(option.value)
              : viewerAnswer === option.value;

            return (
              <div key={option.value} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span
                    className={cn(
                      'truncate text-foreground',
                      isViewerAnswer && 'font-medium text-primary',
                    )}
                  >
                    {option.label}
                    {isViewerAnswer ? ' · Twoja odpowiedź' : ''}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {option.percentage}% · {option.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-border">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      isViewerAnswer ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (
    question.type === FeatureSurveyQuestionType.RATING ||
    question.type === FeatureSurveyQuestionType.NPS
  ) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {question.label}
          </p>
          <p className="text-sm text-muted-foreground">
            Średnia: {result.average ?? 'brak'}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(result.distribution ?? []).map((item) => {
            const isViewerAnswer = viewerAnswer === item.value;
            return (
              <div key={item.value} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span
                    className={cn(
                      'text-foreground',
                      isViewerAnswer && 'font-medium text-primary',
                    )}
                  >
                    {item.value}
                    {isViewerAnswer ? ' · Twoja odpowiedź' : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {item.percentage}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-border">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      isViewerAnswer ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground">{question.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {result.responseCount} {pluralizeResponses(result.responseCount)}
      </p>
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

function pluralizeResponses(count: number): string {
  if (count === 1) return 'odpowiedź';
  if (count >= 2 && count <= 4) return 'odpowiedzi';
  return 'odpowiedzi';
}
