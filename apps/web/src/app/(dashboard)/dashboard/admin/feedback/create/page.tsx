'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ClipboardList,
  Lightbulb,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineSelect } from '@/components/ui/inline-select';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  FeatureSurveyAudience,
  FeatureSurveyQuestionType,
  FeatureSurveyStatus,
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackStatus,
  createFeatureSurveyAdmin,
  createProductFeedbackIdeaAdmin,
  fetchFeatureSurveysAdmin,
  type FeatureSurveyAdminItem,
  type FeatureSurveyAudience as FeatureSurveyAudienceValue,
  type FeatureSurveyQuestion,
  type FeatureSurveyQuestionType as FeatureSurveyQuestionTypeValue,
  type FeatureSurveyStatus as FeatureSurveyStatusValue,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
  type ProductFeedbackPriority as ProductFeedbackPriorityValue,
  type ProductFeedbackStatus as ProductFeedbackStatusValue,
} from '@/lib/product-feedback';

const AUDIENCE_LABELS: Record<FeatureSurveyAudienceValue, string> = {
  all_users: 'Wszyscy',
  registered_users: 'Zalogowani',
  public_visitors: 'Publiczni odwiedzający',
  plan_segment: 'Segment planu',
  beta_users: 'Beta',
};

const SURVEY_STATUS_LABELS: Record<FeatureSurveyStatusValue, string> = {
  draft: 'Szkic',
  active: 'Aktywna',
  closed: 'Zamknięta',
  archived: 'Archiwum',
};

const QUESTION_TYPE_LABELS: Record<FeatureSurveyQuestionTypeValue, string> = {
  single_choice: 'Jednokrotny wybór',
  multiple_choice: 'Wielokrotny wybór',
  rating: 'Ocena',
  nps: 'NPS',
  text: 'Tekst',
};

const CATEGORY_LABELS: Record<ProductFeedbackCategoryValue, string> = {
  listings: 'Oferty',
  clients: 'Klienci',
  calendar: 'Kalendarz',
  reports: 'Raporty',
  public_catalog: 'Katalog publiczny',
  public_listing_submission: 'Dodawanie oferty',
  billing: 'Billing',
  onboarding: 'Onboarding',
  integrations: 'Integracje',
  ui_ux: 'UI / UX',
  other: 'Inne',
};

const FEEDBACK_STATUS_LABELS: Record<ProductFeedbackStatusValue, string> = {
  new: 'Nowe',
  triaged: 'Po triage',
  needs_more_info: 'Wymaga info',
  planned: 'Zaplanowane',
  in_progress: 'W trakcie',
  released: 'Wdrożone',
  declined: 'Odrzucone',
  duplicate: 'Duplikat',
  archived: 'Archiwum',
};

const PRIORITY_LABELS: Record<ProductFeedbackPriorityValue, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

type EditableQuestion = FeatureSurveyQuestion & { optionsText: string };

function createEmptyQuestion(index: number): EditableQuestion {
  return {
    id: `q_${index}_${Date.now()}`,
    type: FeatureSurveyQuestionType.SINGLE_CHOICE,
    label: '',
    required: true,
    optionsText: 'Tak\nNie',
  };
}

export default function AdminFeedbackCreatePage() {
  const { user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [surveys, setSurveys] = useState<FeatureSurveyAdminItem[]>([]);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDescription, setSurveyDescription] = useState('');
  const [surveyStatus, setSurveyStatus] = useState<FeatureSurveyStatusValue>(
    FeatureSurveyStatus.DRAFT,
  );
  const [surveyAudience, setSurveyAudience] =
    useState<FeatureSurveyAudienceValue>(
      FeatureSurveyAudience.REGISTERED_USERS,
    );
  const [planCodes, setPlanCodes] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([
    createEmptyQuestion(1),
  ]);
  const [isSurveySubmitting, setIsSurveySubmitting] = useState(false);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaTeamResponse, setIdeaTeamResponse] = useState('');
  const [ideaCategory, setIdeaCategory] =
    useState<ProductFeedbackCategoryValue>(ProductFeedbackCategory.OTHER);
  const [ideaStatus, setIdeaStatus] = useState<ProductFeedbackStatusValue>(
    ProductFeedbackStatus.TRIAGED,
  );
  const [ideaPriority, setIdeaPriority] =
    useState<ProductFeedbackPriorityValue>(ProductFeedbackPriority.MEDIUM);
  const [isIdeaSubmitting, setIsIdeaSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    fetchFeatureSurveysAdmin()
      .then((result) => {
        if (isMounted) setSurveys(result);
      })
      .catch(() => {
        if (isMounted) setSurveys([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const surveyStatusOptions = useMemo(
    () => toOptions(SURVEY_STATUS_LABELS),
    [],
  );
  const audienceOptions = useMemo(() => toOptions(AUDIENCE_LABELS), []);
  const questionTypeOptions = useMemo(
    () => toOptions(QUESTION_TYPE_LABELS),
    [],
  );
  const categoryOptions = useMemo(() => toOptions(CATEGORY_LABELS), []);
  const feedbackStatusOptions = useMemo(
    () => toOptions(FEEDBACK_STATUS_LABELS),
    [],
  );
  const priorityOptions = useMemo(() => toOptions(PRIORITY_LABELS), []);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tworzenie ankiet i pomysłów jest dostępne tylko dla administratorów.
        </p>
      </div>
    );
  }

  async function handleCreateSurvey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSurveySubmitting(true);
      const normalizedQuestions = questions.map(normalizeQuestion);

      const created = await createFeatureSurveyAdmin({
        title: surveyTitle.trim(),
        description: surveyDescription.trim() || undefined,
        status: surveyStatus,
        audience: surveyAudience,
        questions: normalizedQuestions,
        audienceRules:
          surveyAudience === FeatureSurveyAudience.PLAN_SEGMENT
            ? { planCodes: parseList(planCodes) }
            : undefined,
      });

      setSurveys((current) => [created, ...current]);
      setSurveyTitle('');
      setSurveyDescription('');
      setSurveyStatus(FeatureSurveyStatus.DRAFT);
      setSurveyAudience(FeatureSurveyAudience.REGISTERED_USERS);
      setPlanCodes('');
      setQuestions([createEmptyQuestion(1)]);
      showSuccessToast({ title: 'Ankieta utworzona' });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się utworzyć ankiety',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSurveySubmitting(false);
    }
  }

  async function handleCreateIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsIdeaSubmitting(true);
      await createProductFeedbackIdeaAdmin({
        title: ideaTitle.trim(),
        description: ideaDescription.trim(),
        category: ideaCategory,
        status: ideaStatus,
        internalPriority: ideaPriority,
        teamResponse: ideaTeamResponse.trim() || undefined,
      });

      setIdeaTitle('');
      setIdeaDescription('');
      setIdeaTeamResponse('');
      setIdeaCategory(ProductFeedbackCategory.OTHER);
      setIdeaStatus(ProductFeedbackStatus.TRIAGED);
      setIdeaPriority(ProductFeedbackPriority.MEDIUM);
      showSuccessToast({ title: 'Pomysł dodany do głosowania' });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się dodać pomysłu',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsIdeaSubmitting(false);
    }
  }

  function updateQuestion(
    index: number,
    patch: Partial<EditableQuestion>,
  ): void {
    setQuestions((current) =>
      current.map((question, currentIndex) =>
        currentIndex === index ? { ...question, ...patch } : question,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/feedback"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Wróć do panelu feedbacku
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">
          Tworzenie ankiet i pomysłów
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Ankiety zbierają odpowiedzi, a ręcznie dodane pomysły trafiają od razu
          do głosowania dla zalogowanych użytkowników.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          onSubmit={handleCreateSurvey}
          className="rounded-2xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold">Nowa ankieta</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Tytuł</span>
              <Input
                value={surveyTitle}
                maxLength={160}
                required
                className="h-10 rounded-xl"
                onChange={(event) => setSurveyTitle(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Opis</span>
              <textarea
                value={surveyDescription}
                maxLength={2000}
                rows={3}
                className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setSurveyDescription(event.target.value)}
              />
            </label>
            <SelectField
              label="Status"
              value={surveyStatus}
              options={surveyStatusOptions}
              onChange={(value) =>
                setSurveyStatus(value as FeatureSurveyStatusValue)
              }
            />
            <SelectField
              label="Odbiorcy"
              value={surveyAudience}
              options={audienceOptions}
              onChange={(value) =>
                setSurveyAudience(value as FeatureSurveyAudienceValue)
              }
            />
            {surveyAudience === FeatureSurveyAudience.PLAN_SEGMENT ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">
                  Kody planów po przecinku
                </span>
                <Input
                  value={planCodes}
                  placeholder="free, starter, professional"
                  className="h-10 rounded-xl"
                  onChange={(event) => setPlanCodes(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-lg font-semibold">Pytania</h3>
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() =>
                  setQuestions((current) => [
                    ...current,
                    createEmptyQuestion(current.length + 1),
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Dodaj pytanie
              </Button>
            </div>

            {questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_190px_auto]">
                  <Input
                    value={question.label}
                    required
                    maxLength={240}
                    placeholder="Treść pytania"
                    className="h-10 rounded-xl bg-white"
                    onChange={(event) =>
                      updateQuestion(index, { label: event.target.value })
                    }
                  />
                  <InlineSelect
                    value={question.type}
                    placeholder="Typ pytania"
                    options={questionTypeOptions}
                    onChange={(value) =>
                      updateQuestion(index, {
                        type: value as FeatureSurveyQuestionTypeValue,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={questions.length === 1}
                    onClick={() =>
                      setQuestions((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      )
                    }
                    aria-label="Usuń pytanie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={question.required ?? false}
                      onChange={(event) =>
                        updateQuestion(index, {
                          required: event.target.checked,
                        })
                      }
                    />
                    Wymagane
                  </label>
                </div>

                {requiresOptions(question.type) ? (
                  <label className="mt-3 block space-y-1.5">
                    <span className="text-sm font-medium">
                      Opcje, każda w osobnej linii
                    </span>
                    <textarea
                      value={question.optionsText}
                      rows={4}
                      className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      onChange={(event) =>
                        updateQuestion(index, {
                          optionsText: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="mt-5 rounded-xl"
            disabled={isSurveySubmitting}
          >
            Utwórz ankietę
          </Button>
        </form>

        <div className="space-y-6">
          <form
            onSubmit={handleCreateIdea}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-semibold">
                Pomysł do głosowania
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Tytuł</span>
                <Input
                  value={ideaTitle}
                  required
                  maxLength={160}
                  className="h-10 rounded-xl"
                  onChange={(event) => setIdeaTitle(event.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Opis</span>
                <textarea
                  value={ideaDescription}
                  required
                  maxLength={5000}
                  rows={5}
                  className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setIdeaDescription(event.target.value)}
                />
              </label>
              <SelectField
                label="Obszar"
                value={ideaCategory}
                options={categoryOptions}
                onChange={(value) =>
                  setIdeaCategory(value as ProductFeedbackCategoryValue)
                }
              />
              <SelectField
                label="Status"
                value={ideaStatus}
                options={feedbackStatusOptions}
                onChange={(value) =>
                  setIdeaStatus(value as ProductFeedbackStatusValue)
                }
              />
              <SelectField
                label="Priorytet zespołu"
                value={ideaPriority}
                options={priorityOptions}
                onChange={(value) =>
                  setIdeaPriority(value as ProductFeedbackPriorityValue)
                }
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Komunikat dla użytkowników
                </span>
                <textarea
                  value={ideaTeamResponse}
                  maxLength={2000}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setIdeaTeamResponse(event.target.value)}
                />
              </label>
            </div>

            <Button
              type="submit"
              className="mt-5 rounded-xl"
              disabled={isIdeaSubmitting}
            >
              Dodaj do głosowania
            </Button>
          </form>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold">
                Ostatnie ankiety
              </h2>
              <Badge variant="outline">{surveys.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {surveys.slice(0, 6).map((survey) => (
                <div
                  key={survey.id}
                  className="rounded-xl border border-border px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{survey.title}</p>
                    <Badge variant="outline">
                      {SURVEY_STATUS_LABELS[survey.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {AUDIENCE_LABELS[survey.audience]} ·{' '}
                    {survey.questions.length} pytań
                  </p>
                </div>
              ))}
              {surveys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak utworzonych ankiet.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
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
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        className="h-10 w-full rounded-xl border border-border/80 bg-white px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

function normalizeQuestion(question: EditableQuestion): FeatureSurveyQuestion {
  const normalized: FeatureSurveyQuestion = {
    id: question.id,
    type: question.type,
    label: question.label.trim(),
    required: question.required,
  };

  if (requiresOptions(question.type)) {
    normalized.options = parseList(question.optionsText).map((label) => ({
      value: slugify(label),
      label,
    }));
  }

  if (question.type === FeatureSurveyQuestionType.RATING) {
    normalized.min = 1;
    normalized.max = 5;
  }

  return normalized;
}

function requiresOptions(type: FeatureSurveyQuestionTypeValue): boolean {
  return (
    type === FeatureSurveyQuestionType.SINGLE_CHOICE ||
    type === FeatureSurveyQuestionType.MULTIPLE_CHOICE
  );
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || `option_${Date.now()}`
  );
}

function toOptions<T extends string>(
  labels: Record<T, string>,
): Array<{ value: T; label: string }> {
  return Object.entries(labels).map(([value, label]) => ({
    value: value as T,
    label: label as string,
  }));
}
