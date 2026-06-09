'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, FileText, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { getMarkdownContentIssues } from './blog-markdown';
import {
  BlogContentFormat,
  BlogPostStatus,
  BlogRobotsDirective,
  createBlogPostAdmin,
  fetchBlogAuthorsAdmin,
  fetchBlogCategoriesAdmin,
  fetchPublicBlogPosts,
  updateBlogPostAdmin,
  type AdminBlogAuthor,
  type AdminBlogCategory,
  type AdminBlogPost,
  type BlogPostEditorInput,
  type PublicBlogPostListItem,
} from '@/lib/blog';
import { cn } from '@/lib/utils';

interface BlogPostFormProps {
  post?: AdminBlogPost;
}

interface SeoValidationIssue {
  field: string;
  message: string;
}

const STATUS_OPTIONS = [
  { value: BlogPostStatus.DRAFT, label: 'Szkic' },
  { value: BlogPostStatus.SCHEDULED, label: 'Zaplanowany' },
  { value: BlogPostStatus.PUBLISHED, label: 'Opublikowany' },
  { value: BlogPostStatus.ARCHIVED, label: 'Archiwum' },
];

const ROBOTS_OPTIONS = [
  { value: BlogRobotsDirective.NOINDEX_FOLLOW, label: 'noindex, follow' },
  { value: BlogRobotsDirective.INDEX_FOLLOW, label: 'index, follow' },
];

export function BlogPostForm({ post }: BlogPostFormProps) {
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const isEdit = Boolean(post);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);
  const [authors, setAuthors] = useState<AdminBlogAuthor[]>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<PublicBlogPostListItem[]>(
    [],
  );
  const [areRelatedPostsLoading, setAreRelatedPostsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPostEditorInput>(() =>
    getInitialFormState(post),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMetadata() {
      try {
        const [categoryResponse, authorResponse] = await Promise.all([
          fetchBlogCategoriesAdmin(),
          fetchBlogAuthorsAdmin(),
        ]);
        if (!isMounted) return;
        setCategories(categoryResponse);
        setAuthors(authorResponse);
      } catch (error) {
        if (!isMounted) return;
        showErrorToast({
          title: 'Nie udało się pobrać słowników bloga',
          description: getApiErrorMessage(error),
        });
      } finally {
        if (isMounted) setIsMetadataLoading(false);
      }
    }

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [showErrorToast]);

  useEffect(() => {
    if (!form.categoryId) {
      setRelatedPosts([]);
      return;
    }

    let isMounted = true;

    async function loadRelatedPosts() {
      try {
        setAreRelatedPostsLoading(true);
        const response = await fetchPublicBlogPosts({
          categoryId: form.categoryId ?? undefined,
          limit: 4,
        });

        if (!isMounted) return;
        setRelatedPosts(
          response.data.filter((item) => item.slug !== form.slug).slice(0, 3),
        );
      } catch {
        if (!isMounted) return;
        setRelatedPosts([]);
      } finally {
        if (isMounted) setAreRelatedPostsLoading(false);
      }
    }

    loadRelatedPosts();

    return () => {
      isMounted = false;
    };
  }, [form.categoryId, form.slug]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );
  const authorOptions = useMemo(
    () =>
      authors.map((author) => ({
        value: author.id,
        label: author.displayName,
      })),
    [authors],
  );
  const seoIssues = useMemo(() => validateSeoReadiness(form), [form]);
  const isTryingToPublish = form.status === BlogPostStatus.PUBLISHED;

  function updateField<K extends keyof BlogPostEditorInput>(
    key: K,
    value: BlogPostEditorInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: current.slug || slugify(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGlobalError(null);

    const basicError = validateBasics(form);
    if (basicError) {
      setGlobalError(basicError);
      return;
    }

    if (isTryingToPublish && seoIssues.length > 0) {
      setGlobalError('Uzupełnij wymagane pola SEO przed publikacją wpisu.');
      return;
    }

    try {
      setIsSaving(true);
      const savedPost = isEdit
        ? await updateBlogPostAdmin(post!.id, form)
        : await createBlogPostAdmin(form);

      showSuccessToast({
        title: isEdit ? 'Wpis zaktualizowany' : 'Wpis utworzony',
      });
      router.push(`/dashboard/blog/${savedPost.id}/edit`);
      router.refresh();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setGlobalError(message);
      showErrorToast({
        title: 'Nie udało się zapisać wpisu',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Link
        href="/dashboard/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy wpisów
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isEdit ? 'Edytuj wpis blogowy' : 'Nowy wpis blogowy'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Zapisuj szkic w trakcie pracy. Publikacja wymaga kompletu pól SEO,
            cover image i treści bez nagłówka H1.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {post ? (
            <Link
              href={`/dashboard/blog/${post.id}/preview`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Eye className="h-4 w-4" />
              Podgląd roboczy
            </Link>
          ) : null}
          {post?.status === BlogPostStatus.PUBLISHED ? (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Podgląd publiczny
            </Link>
          ) : null}
          <Button
            type="submit"
            className="gap-2 rounded-xl"
            disabled={isSaving}
          >
            {form.status === BlogPostStatus.PUBLISHED ? (
              <Send className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>

      {globalError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FormSection title="Treść artykułu">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tytuł" required className="sm:col-span-2">
                <Input
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="np. Jak przygotować mieszkanie do sprzedaży"
                  className="h-10 rounded-xl"
                />
              </FormField>

              <FormField label="Slug" required>
                <div className="flex gap-2">
                  <Input
                    value={form.slug}
                    onChange={(event) =>
                      updateField('slug', slugify(event.target.value))
                    }
                    placeholder="jak-przygotowac-mieszkanie"
                    className="h-10 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => updateField('slug', slugify(form.title))}
                  >
                    Generuj
                  </Button>
                </div>
              </FormField>

              <FormField label="Status">
                <InlineSelect
                  value={form.status ?? BlogPostStatus.DRAFT}
                  placeholder="Status"
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    updateField('status', value as BlogPostStatus)
                  }
                />
              </FormField>

              <FormField label="Lead / excerpt" className="sm:col-span-2">
                <textarea
                  value={form.excerpt ?? ''}
                  onChange={(event) =>
                    updateField('excerpt', event.target.value)
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Krótki opis artykułu widoczny na liście i w metadata fallback."
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-6 shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </FormField>

              <FormField
                label="Treść Markdown"
                required
                className="sm:col-span-2"
              >
                <textarea
                  value={form.content ?? ''}
                  onChange={(event) =>
                    updateField('content', event.target.value)
                  }
                  rows={18}
                  maxLength={100_000}
                  placeholder={`## Pierwsza sekcja\n\nTreść artykułu...\n\n![Opisowy alt obrazu](/images/blog/przyklad.jpg)\n\n::cta register\n\n::featured-listings\n\n:::faq\n### Jakie pytanie zadaje klient?\nKrótka, konkretna odpowiedź.\n:::\n\n- punkt listy\n- kolejny punkt`}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm leading-6 shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Dostępne CTA: `::cta register`, `::cta contact`, `::cta
                  submit-listing`, `::cta listings`. FAQ zapisuj między `:::faq`
                  i `:::`, używając `### Pytanie`. Wyróżnione oferty:
                  `::featured-listings`.
                </p>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="SEO i obrazek">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="SEO title" required>
                <Input
                  value={form.seoTitle ?? ''}
                  onChange={(event) =>
                    updateField('seoTitle', event.target.value)
                  }
                  maxLength={70}
                  placeholder="Do ok. 50-60 znaków"
                  className="h-10 rounded-xl"
                />
              </FormField>
              <FormField label="Robots">
                <InlineSelect
                  value={form.robots ?? BlogRobotsDirective.NOINDEX_FOLLOW}
                  placeholder="Robots"
                  options={ROBOTS_OPTIONS}
                  onChange={(value) =>
                    updateField('robots', value as BlogRobotsDirective)
                  }
                />
              </FormField>
              <FormField
                label="SEO description"
                required
                className="sm:col-span-2"
              >
                <textarea
                  value={form.seoDescription ?? ''}
                  onChange={(event) =>
                    updateField('seoDescription', event.target.value)
                  }
                  rows={3}
                  maxLength={180}
                  placeholder="Opis do wyników wyszukiwania, najlepiej do ok. 150-160 znaków."
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-6 shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </FormField>
              <FormField label="Canonical URL" className="sm:col-span-2">
                <Input
                  value={form.canonicalUrl ?? ''}
                  onChange={(event) =>
                    updateField('canonicalUrl', event.target.value)
                  }
                  placeholder="Opcjonalnie, domyślnie /blog/[slug]"
                  className="h-10 rounded-xl"
                />
              </FormField>
              <FormField label="Cover image URL" required>
                <Input
                  value={form.coverImageUrl ?? ''}
                  onChange={(event) =>
                    updateField('coverImageUrl', event.target.value)
                  }
                  placeholder="https://..."
                  className="h-10 rounded-xl"
                />
              </FormField>
              <FormField label="Cover image alt" required>
                <Input
                  value={form.coverImageAlt ?? ''}
                  onChange={(event) =>
                    updateField('coverImageAlt', event.target.value)
                  }
                  placeholder="Opisowy tekst alternatywny"
                  className="h-10 rounded-xl"
                />
              </FormField>
            </div>
          </FormSection>
        </div>

        <aside className="space-y-6">
          <FormSection title="Organizacja">
            <div className="space-y-4">
              <FormField label="Kategoria">
                <InlineSelect
                  value={form.categoryId ?? ''}
                  placeholder={isMetadataLoading ? 'Kategorie...' : 'Kategoria'}
                  options={categoryOptions}
                  onChange={(value) => updateField('categoryId', value || null)}
                />
              </FormField>
              <FormField label="Autor">
                <InlineSelect
                  value={form.authorId ?? ''}
                  placeholder={isMetadataLoading ? 'Autorzy...' : 'Autor'}
                  options={authorOptions}
                  onChange={(value) => updateField('authorId', value || null)}
                />
              </FormField>
              <FormField label="Data publikacji">
                <Input
                  type="datetime-local"
                  value={toDatetimeLocalValue(form.publishedAt)}
                  onChange={(event) =>
                    updateField(
                      'publishedAt',
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    )
                  }
                  className="h-10 rounded-xl"
                />
              </FormField>
              <FormField label="Tagi">
                <Input
                  value={(form.tags ?? []).join(', ')}
                  onChange={(event) =>
                    updateField(
                      'tags',
                      event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="sprzedaż, poradnik, mieszkanie"
                  className="h-10 rounded-xl"
                />
              </FormField>
            </div>
          </FormSection>

          <SeoReadinessPanel issues={seoIssues} />
          <InternalLinkSuggestions
            category={categories.find(
              (category) => category.id === form.categoryId,
            )}
            relatedPosts={relatedPosts}
            isLoading={areRelatedPostsLoading}
          />
        </aside>
      </div>
    </form>
  );
}

function SeoReadinessPanel({ issues }: { issues: SeoValidationIssue[] }) {
  const isReady = issues.length === 0;

  return (
    <section
      className={cn(
        'rounded-2xl border bg-card p-5 shadow-sm',
        isReady ? 'border-emerald-200' : 'border-amber-200',
      )}
    >
      <div className="flex items-center gap-2">
        <FileText
          className={cn(
            'h-5 w-5',
            isReady ? 'text-emerald-600' : 'text-amber-600',
          )}
        />
        <h2 className="font-heading text-base font-semibold">Gotowość SEO</h2>
      </div>
      {isReady ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Wpis ma komplet pól wymaganych do publikacji.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {issues.map((issue) => (
            <li key={issue.field}>- {issue.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InternalLinkSuggestions({
  category,
  relatedPosts,
  isLoading,
}: {
  category?: AdminBlogCategory;
  relatedPosts: PublicBlogPostListItem[];
  isLoading: boolean;
}) {
  const suggestions = [
    {
      label: 'Katalog ofert',
      markdown: '[aktualne oferty nieruchomości](/oferty)',
    },
    {
      label: 'Dodanie oferty',
      markdown: '[dodaj ofertę nieruchomości](/dodaj-oferte)',
    },
    {
      label: 'Rejestracja',
      markdown: '[załóż konto w EstateFlow](/register)',
    },
    ...(category
      ? [
          {
            label: `Kategoria: ${category.name}`,
            markdown: `[${category.name}](/blog/kategoria/${category.slug})`,
          },
        ]
      : []),
    ...relatedPosts.map((relatedPost) => ({
      label: relatedPost.title,
      markdown: `[${relatedPost.title}](/blog/${relatedPost.slug})`,
    })),
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-heading text-base font-semibold">
        Sugestie linkowania
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Wklej wybrany link w treści artykułu jako Markdown.
      </p>
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Szukam powiązanych wpisów...
          </p>
        ) : null}
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.markdown}
            className="rounded-xl border border-border bg-muted/30 p-3"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {suggestion.label}
            </p>
            <code className="mt-1 block break-all text-xs leading-5 text-foreground">
              {suggestion.markdown}
            </code>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FormField({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function getInitialFormState(post?: AdminBlogPost): BlogPostEditorInput {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    contentFormat: post?.contentFormat ?? BlogContentFormat.MARKDOWN,
    coverImageUrl: post?.coverImageUrl ?? '',
    coverImageAlt: post?.coverImageAlt ?? '',
    status: post?.status ?? BlogPostStatus.DRAFT,
    categoryId: post?.category?.id ?? null,
    authorId: post?.author?.id ?? null,
    seoTitle: post?.seoTitle ?? '',
    seoDescription: post?.seoDescription ?? '',
    canonicalUrl: post?.canonicalUrl ?? '',
    robots: post?.robots ?? BlogRobotsDirective.NOINDEX_FOLLOW,
    publishedAt: post?.publishedAt ?? null,
    tags: post?.tags ?? [],
  };
}

function validateBasics(form: BlogPostEditorInput) {
  if (!form.title.trim()) return 'Tytuł jest wymagany.';
  if (!form.slug.trim()) return 'Slug jest wymagany.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    return 'Slug może zawierać tylko małe litery, cyfry i pojedyncze myślniki.';
  }

  return null;
}

function validateSeoReadiness(form: BlogPostEditorInput): SeoValidationIssue[] {
  const issues: SeoValidationIssue[] = [];
  const requiredFields: Array<[keyof BlogPostEditorInput, string]> = [
    ['excerpt', 'Dodaj lead / excerpt.'],
    ['content', 'Dodaj treść artykułu.'],
    ['seoTitle', 'Dodaj SEO title.'],
    ['seoDescription', 'Dodaj SEO description.'],
    ['coverImageUrl', 'Dodaj cover image URL.'],
    ['coverImageAlt', 'Dodaj opisowy alt obrazka.'],
  ];

  for (const [field, message] of requiredFields) {
    const value = form[field];
    if (typeof value !== 'string' || !value.trim()) {
      issues.push({ field, message });
    }
  }

  if (form.content) {
    issues.push(...getMarkdownContentIssues(form.content));
  }

  return issues;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160);
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 16);
}
