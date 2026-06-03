'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Archive,
  Edit3,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Send,
  Plus,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  archiveBlogPostAdmin,
  BlogPostStatus,
  fetchBlogAuthorsAdmin,
  fetchBlogCategoriesAdmin,
  fetchBlogPostsAdmin,
  formatBlogDate,
  publishBlogPostAdmin,
  unpublishBlogPostAdmin,
  type AdminBlogAuthor,
  type AdminBlogCategory,
  type AdminBlogPost,
  type AdminBlogPostsFilters,
  type BlogPostStatus as BlogPostStatusValue,
} from '@/lib/blog';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: AdminBlogPostsFilters = {
  page: 1,
  limit: 20,
};

const STATUS_LABELS: Record<BlogPostStatusValue, string> = {
  draft: 'Szkic',
  scheduled: 'Zaplanowany',
  published: 'Opublikowany',
  archived: 'Archiwum',
};

const STATUS_STYLES: Record<BlogPostStatusValue, string> = {
  draft: 'border-stone-200 bg-stone-50 text-stone-700',
  scheduled: 'border-amber-200 bg-amber-50 text-amber-800',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  archived: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function BlogDashboardPage() {
  const { user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [items, setItems] = useState<AdminBlogPost[]>([]);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);
  const [authors, setAuthors] = useState<AdminBlogAuthor[]>([]);
  const [filters, setFilters] =
    useState<AdminBlogPostsFilters>(DEFAULT_FILTERS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;

    async function loadPosts() {
      try {
        const response = await fetchBlogPostsAdmin(filters);
        if (!isMounted) return;
        setItems(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [filters, isAdmin, refreshToken]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

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
      } catch {
        if (!isMounted) return;
        setCategories([]);
        setAuthors([]);
      } finally {
        if (isMounted) setIsMetaLoading(false);
      }
    }

    loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const statusOptions = useMemo(
    () =>
      Object.entries(STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );
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
  const hasFilters = Boolean(
    filters.status || filters.categoryId || filters.authorId || filters.search,
  );

  function updateFilter<K extends keyof AdminBlogPostsFilters>(
    key: K,
    value: AdminBlogPostsFilters[K],
  ) {
    setIsLoading(true);
    setError(null);
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: 1,
    }));
  }

  async function runPostAction(
    post: AdminBlogPost,
    action: 'publish' | 'unpublish' | 'archive',
  ) {
    const actionMap = {
      publish: {
        run: publishBlogPostAdmin,
        success: 'Wpis opublikowany',
      },
      unpublish: {
        run: unpublishBlogPostAdmin,
        success: 'Wpis wycofany do szkicu',
      },
      archive: {
        run: archiveBlogPostAdmin,
        success: 'Wpis zarchiwizowany',
      },
    } as const;

    try {
      setPendingPostId(post.id);
      const updatedPost = await actionMap[action].run(post.id);
      setItems((current) =>
        current.map((item) => (item.id === post.id ? updatedPost : item)),
      );
      showSuccessToast({ title: actionMap[action].success });
    } catch (actionError) {
      showErrorToast({
        title: 'Nie udało się zaktualizować wpisu',
        description: getApiErrorMessage(actionError),
      });
    } finally {
      setPendingPostId(null);
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
          Panel bloga jest dostępny tylko dla administratorów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Blog
            </h1>
            <Badge variant="outline" className="rounded-full">
              {total} wpisów
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Redakcyjny widok wpisów blogowych. Zarządzaj publikacją, filtruj
            szkice i sprawdzaj, które artykuły są gotowe do publikacji.
          </p>
        </div>

        <Link
          href="/dashboard/blog/new"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Nowy wpis
        </Link>
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

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-primary" />
          Filtry
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search ?? ''}
              placeholder="Szukaj po tytule, slugu lub leadzie..."
              className="h-9 rounded-xl pl-9"
              onChange={(event) =>
                updateFilter('search', event.target.value || undefined)
              }
            />
          </div>
          <InlineSelect
            size="sm"
            value={filters.status ?? ''}
            placeholder="Status"
            onChange={(value) =>
              updateFilter(
                'status',
                (value || undefined) as BlogPostStatusValue | undefined,
              )
            }
            options={statusOptions}
          />
          <InlineSelect
            size="sm"
            value={filters.categoryId ?? ''}
            placeholder={isMetaLoading ? 'Kategorie...' : 'Kategoria'}
            onChange={(value) => updateFilter('categoryId', value || undefined)}
            options={categoryOptions}
          />
          <InlineSelect
            size="sm"
            value={filters.authorId ?? ''}
            placeholder={isMetaLoading ? 'Autorzy...' : 'Autor'}
            onChange={(value) => updateFilter('authorId', value || undefined)}
            options={authorOptions}
          />
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                setError(null);
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Wyczyść
            </Button>
          ) : null}
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-4">
          {items.map((post) => (
            <BlogAdminCard
              key={post.id}
              post={post}
              isPending={pendingPostId === post.id}
              onPublish={() => runPostAction(post, 'publish')}
              onUnpublish={() => runPostAction(post, 'unpublish')}
              onArchive={() => runPostAction(post, 'archive')}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setFilters((current) => ({
                ...current,
                page: Math.max(1, (current.page ?? 1) - 1),
              }));
            }}
          >
            Poprzednia
          </Button>
          <span className="text-sm text-muted-foreground">
            Strona {filters.page ?? 1} z {totalPages}
          </span>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setFilters((current) => ({
                ...current,
                page: Math.min(totalPages, (current.page ?? 1) + 1),
              }));
            }}
          >
            Następna
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BlogAdminCard({
  post,
  isPending,
  onPublish,
  onUnpublish,
  onArchive,
}: {
  post: AdminBlogPost;
  isPending: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}) {
  const publishedDate = formatBlogDate(post.publishedAt);
  const updatedDate = formatBlogDate(post.updatedAt);
  const publicHref = `/blog/${post.slug}`;
  const canPublish =
    post.status !== BlogPostStatus.PUBLISHED &&
    post.status !== BlogPostStatus.ARCHIVED;
  const canUnpublish = post.status === BlogPostStatus.PUBLISHED;
  const canArchive = post.status !== BlogPostStatus.ARCHIVED;

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                STATUS_STYLES[post.status],
              )}
            >
              {STATUS_LABELS[post.status]}
            </span>
            {post.category ? (
              <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {post.category.name}
              </span>
            ) : null}
            {post.robots === 'noindex_follow' ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                noindex
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 font-heading text-xl font-semibold leading-snug text-foreground">
            {post.title}
          </h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            /blog/{post.slug}
          </p>
          {post.excerpt ? (
            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Autor: {post.author?.displayName ?? 'brak'}</span>
            {publishedDate ? <span>Publikacja: {publishedDate}</span> : null}
            {updatedDate ? <span>Aktualizacja: {updatedDate}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Link
            href={`/dashboard/blog/${post.id}/edit`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Edit3 className="h-4 w-4" />
            Edytuj
          </Link>
          {post.status === BlogPostStatus.PUBLISHED ? (
            <Link
              href={publicHref}
              target="_blank"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Eye className="h-4 w-4" />
              Podgląd
            </Link>
          ) : null}
          {canPublish ? (
            <Button
              size="sm"
              className="gap-1.5 rounded-lg"
              disabled={isPending}
              onClick={onPublish}
            >
              <Send className="h-4 w-4" />
              Publikuj
            </Button>
          ) : null}
          {canUnpublish ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg"
              disabled={isPending}
              onClick={onUnpublish}
            >
              <Undo2 className="h-4 w-4" />
              Wycofaj
            </Button>
          ) : null}
          {canArchive ? (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 rounded-lg"
              disabled={isPending}
              onClick={onArchive}
            >
              <Archive className="h-4 w-4" />
              Archiwizuj
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        {hasFilters ? 'Brak wpisów dla wybranych filtrów' : 'Brak wpisów'}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {hasFilters
          ? 'Zmień filtry albo wyczyść wyszukiwanie, żeby zobaczyć inne wpisy.'
          : 'Po dodaniu pierwszego szkicu pojawi się tutaj lista artykułów do redakcji i publikacji.'}
      </p>
    </div>
  );
}
