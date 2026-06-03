'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Edit3,
  FolderTree,
  Plus,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createBlogAuthorAdmin,
  createBlogCategoryAdmin,
  fetchBlogAuthorsAdmin,
  fetchBlogCategoriesAdmin,
  updateBlogAuthorAdmin,
  updateBlogCategoryAdmin,
  type AdminBlogAuthor,
  type AdminBlogCategory,
  type BlogAuthorEditorInput,
  type BlogCategoryEditorInput,
} from '@/lib/blog';
import { cn } from '@/lib/utils';

const EMPTY_CATEGORY_FORM: BlogCategoryEditorInput = {
  name: '',
  slug: '',
  description: '',
  seoTitle: '',
  seoDescription: '',
  sortOrder: 0,
  isIndexable: true,
};

const EMPTY_AUTHOR_FORM: BlogAuthorEditorInput = {
  displayName: '',
  slug: '',
  bio: '',
  avatarUrl: '',
  role: '',
  expertise: '',
  sameAsLinks: [],
};

export default function BlogTaxonomyPage() {
  const { user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);
  const [authors, setAuthors] = useState<AdminBlogAuthor[]>([]);
  const [categoryForm, setCategoryForm] =
    useState<BlogCategoryEditorInput>(EMPTY_CATEGORY_FORM);
  const [authorForm, setAuthorForm] =
    useState<BlogAuthorEditorInput>(EMPTY_AUTHOR_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;

    async function loadTaxonomy() {
      try {
        const [categoryResponse, authorResponse] = await Promise.all([
          fetchBlogCategoriesAdmin(),
          fetchBlogAuthorsAdmin(),
        ]);
        if (!isMounted) return;
        setCategories(categoryResponse);
        setAuthors(authorResponse);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTaxonomy();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, refreshToken]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((first, second) => {
        if (first.sortOrder !== second.sortOrder) {
          return first.sortOrder - second.sortOrder;
        }

        return first.name.localeCompare(second.name, 'pl');
      }),
    [categories],
  );
  const sortedAuthors = useMemo(
    () =>
      [...authors].sort((first, second) =>
        first.displayName.localeCompare(second.displayName, 'pl'),
      ),
    [authors],
  );

  function resetCategoryForm() {
    setEditingCategoryId(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
  }

  function resetAuthorForm() {
    setEditingAuthorId(null);
    setAuthorForm(EMPTY_AUTHOR_FORM);
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateSlugEntity(
      categoryForm.name,
      categoryForm.slug,
      'Nazwa kategorii',
    );
    if (validationError) {
      showErrorToast({ title: validationError });
      return;
    }

    try {
      setIsSaving(true);
      const savedCategory = editingCategoryId
        ? await updateBlogCategoryAdmin(editingCategoryId, categoryForm)
        : await createBlogCategoryAdmin(categoryForm);

      setCategories((current) =>
        editingCategoryId
          ? current.map((category) =>
              category.id === savedCategory.id ? savedCategory : category,
            )
          : [...current, savedCategory],
      );
      resetCategoryForm();
      showSuccessToast({
        title: editingCategoryId
          ? 'Kategoria zaktualizowana'
          : 'Kategoria utworzona',
      });
    } catch (saveError) {
      showErrorToast({
        title: 'Nie udało się zapisać kategorii',
        description: getApiErrorMessage(saveError),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAuthor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateSlugEntity(
      authorForm.displayName,
      authorForm.slug,
      'Nazwa autora',
    );
    if (validationError) {
      showErrorToast({ title: validationError });
      return;
    }

    try {
      setIsSaving(true);
      const savedAuthor = editingAuthorId
        ? await updateBlogAuthorAdmin(editingAuthorId, authorForm)
        : await createBlogAuthorAdmin(authorForm);

      setAuthors((current) =>
        editingAuthorId
          ? current.map((author) =>
              author.id === savedAuthor.id ? savedAuthor : author,
            )
          : [...current, savedAuthor],
      );
      resetAuthorForm();
      showSuccessToast({
        title: editingAuthorId ? 'Autor zaktualizowany' : 'Autor utworzony',
      });
    } catch (saveError) {
      showErrorToast({
        title: 'Nie udało się zapisać autora',
        description: getApiErrorMessage(saveError),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Słowniki bloga są dostępne tylko dla administratorów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do bloga
          </Link>
          <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">
            Kategorie i autorzy
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Zarządzaj słownikami używanymi w formularzu wpisu, na listach i w
            danych SEO artykułów.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setRefreshToken((current) => current + 1);
          }}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <TaxonomySection
            icon={FolderTree}
            title="Kategorie"
            description="Kategorie porządkują klastry tematyczne i mogą mieć własne SEO title oraz description."
          >
            <form onSubmit={saveCategory} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nazwa" required>
                  <Input
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        name: event.target.value,
                        slug: current.slug || slugify(event.target.value),
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="Poradniki dla sprzedających"
                  />
                </FormField>
                <FormField label="Slug" required>
                  <Input
                    value={categoryForm.slug}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="poradniki-dla-sprzedajacych"
                  />
                </FormField>
                <FormField label="Kolejność">
                  <Input
                    type="number"
                    value={categoryForm.sortOrder ?? 0}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        sortOrder: Number(event.target.value || 0),
                      }))
                    }
                    className="h-10 rounded-xl"
                  />
                </FormField>
                <label className="flex items-center gap-2 pt-7 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={categoryForm.isIndexable ?? true}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        isIndexable: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  Indeksuj stronę kategorii
                </label>
                <FormField label="Opis" className="sm:col-span-2">
                  <textarea
                    value={categoryForm.description ?? ''}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm leading-6 shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                </FormField>
                <FormField label="SEO title">
                  <Input
                    value={categoryForm.seoTitle ?? ''}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        seoTitle: event.target.value,
                      }))
                    }
                    maxLength={70}
                    className="h-10 rounded-xl"
                  />
                </FormField>
                <FormField label="SEO description">
                  <Input
                    value={categoryForm.seoDescription ?? ''}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        seoDescription: event.target.value,
                      }))
                    }
                    maxLength={180}
                    className="h-10 rounded-xl"
                  />
                </FormField>
              </div>

              <FormActions
                isSaving={isSaving}
                isEditing={Boolean(editingCategoryId)}
                onCancel={resetCategoryForm}
              />
            </form>

            <TaxonomyList>
              {sortedCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {category.name}
                      </p>
                      {category.isIndexable ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          index
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          noindex
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      /blog/kategoria/{category.slug}
                    </p>
                    {category.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryForm(toCategoryForm(category));
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edytuj
                  </Button>
                </li>
              ))}
            </TaxonomyList>
          </TaxonomySection>

          <TaxonomySection
            icon={UserRound}
            title="Autorzy"
            description="Autorzy wzmacniają E-E-A-T artykułów i dane strukturalne Article/Person."
          >
            <form onSubmit={saveAuthor} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nazwa autora" required>
                  <Input
                    value={authorForm.displayName}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                        slug: current.slug || slugify(event.target.value),
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="Anna Kowalska"
                  />
                </FormField>
                <FormField label="Slug" required>
                  <Input
                    value={authorForm.slug}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="anna-kowalska"
                  />
                </FormField>
                <FormField label="Rola">
                  <Input
                    value={authorForm.role ?? ''}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="Ekspert rynku nieruchomości"
                  />
                </FormField>
                <FormField label="Avatar URL">
                  <Input
                    value={authorForm.avatarUrl ?? ''}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        avatarUrl: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="https://..."
                  />
                </FormField>
                <FormField label="Bio" className="sm:col-span-2">
                  <textarea
                    value={authorForm.bio ?? ''}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm leading-6 shadow-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                  />
                </FormField>
                <FormField label="Ekspertyza" className="sm:col-span-2">
                  <Input
                    value={authorForm.expertise ?? ''}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        expertise: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="sprzedaż mieszkań, home staging, SEO ofert"
                  />
                </FormField>
                <FormField label="Linki profilowe" className="sm:col-span-2">
                  <Input
                    value={(authorForm.sameAsLinks ?? []).join(', ')}
                    onChange={(event) =>
                      setAuthorForm((current) => ({
                        ...current,
                        sameAsLinks: event.target.value
                          .split(',')
                          .map((link) => link.trim())
                          .filter(Boolean),
                      }))
                    }
                    className="h-10 rounded-xl"
                    placeholder="https://linkedin.com/in/..."
                  />
                </FormField>
              </div>

              <FormActions
                isSaving={isSaving}
                isEditing={Boolean(editingAuthorId)}
                onCancel={resetAuthorForm}
              />
            </form>

            <TaxonomyList>
              {sortedAuthors.map((author) => (
                <li
                  key={author.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {author.displayName}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      autor: {author.slug}
                    </p>
                    {author.role ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {author.role}
                      </p>
                    ) : null}
                    {author.expertise ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ekspertyza: {author.expertise}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => {
                      setEditingAuthorId(author.id);
                      setAuthorForm(toAuthorForm(author));
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edytuj
                  </Button>
                </li>
              ))}
            </TaxonomyList>
          </TaxonomySection>
        </div>
      )}
    </div>
  );
}

function TaxonomySection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FolderTree;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function TaxonomyList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-3 border-t border-border pt-5">{children}</ul>;
}

function FormActions({
  isSaving,
  isEditing,
  onCancel,
}: {
  isSaving: boolean;
  isEditing: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" className="gap-2 rounded-xl" disabled={isSaving}>
        {isEditing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {isSaving ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj'}
      </Button>
      {isEditing ? (
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          Anuluj edycję
        </Button>
      ) : null}
    </div>
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

function toCategoryForm(category: AdminBlogCategory): BlogCategoryEditorInput {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    seoTitle: category.seoTitle ?? '',
    seoDescription: category.seoDescription ?? '',
    sortOrder: category.sortOrder,
    isIndexable: category.isIndexable,
  };
}

function toAuthorForm(author: AdminBlogAuthor): BlogAuthorEditorInput {
  return {
    displayName: author.displayName,
    slug: author.slug,
    bio: author.bio ?? '',
    avatarUrl: author.avatarUrl ?? '',
    role: author.role ?? '',
    expertise: author.expertise ?? '',
    sameAsLinks: author.sameAsLinks ?? [],
  };
}

function validateSlugEntity(name: string, slug: string, label: string) {
  if (!name.trim()) return `${label} jest wymagana.`;
  if (!slug.trim()) return 'Slug jest wymagany.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Slug może zawierać tylko małe litery, cyfry i pojedyncze myślniki.';
  }

  return null;
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
