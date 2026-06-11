/* eslint-disable @next/next/no-img-element */
'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Edit3, UserRound } from 'lucide-react';
import {
  ArticleCta,
  BlogMarkdown,
  BlogTableOfContents,
} from '@/components/blog';
import {
  getMarkdownHeadings,
  hasMarkdownFeaturedListingsBlock,
} from '@/components/blog/blog-markdown';
import { Badge } from '@/components/ui/badge';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchBlogPostAdmin,
  formatBlogDate,
  type AdminBlogPost,
  type BlogPostStatus as BlogPostStatusValue,
} from '@/lib/blog';
import { cn } from '@/lib/utils';

interface BlogPreviewPageProps {
  params: Promise<{ id: string }>;
}

const FALLBACK_BLOG_IMAGE = '/images/hero/interior-1.jpg';

const STATUS_LABELS: Record<BlogPostStatusValue, string> = {
  draft: 'Szkic',
  scheduled: 'Zaplanowany',
  published: 'Opublikowany',
  archived: 'Archiwum',
};

const STATUS_STYLES: Record<BlogPostStatusValue, string> = {
  draft: 'border-stone-200 bg-stone-50 text-stone-700',
  scheduled: 'border-amber-200 bg-amber-50 text-amber-800',
  published: 'border-status-success/25 bg-status-success-bg text-status-success',
  archived: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function BlogPreviewPage({ params }: BlogPreviewPageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      try {
        const response = await fetchBlogPostAdmin(id);
        if (!isMounted) return;
        setPost(response);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold">
            Nie udało się pobrać podglądu
          </h1>
          <p className="mt-2 text-sm text-destructive">
            {error ?? 'Wpis nie istnieje albo nie masz do niego dostępu.'}
          </p>
        </div>
      </div>
    );
  }

  const imageUrl = post.coverImageUrl || FALLBACK_BLOG_IMAGE;
  const publishedDate = formatBlogDate(post.publishedAt);
  const updatedDate = formatBlogDate(post.updatedAt);
  const headings = getMarkdownHeadings(post.content);
  const shouldShowFeaturedListings = hasMarkdownFeaturedListingsBlock(
    post.content,
  );

  return (
    <article className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <BackLink />
        <Link
          href={`/dashboard/blog/${post.id}/edit`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <Edit3 className="h-4 w-4" />
          Edytuj wpis
        </Link>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        To jest roboczy podgląd dostępny w dashboardzie. Publiczne SEO i
        indeksowanie dotyczą tylko opublikowanej trasy `/blog/{post.slug}`.
      </section>

      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn('rounded-full', STATUS_STYLES[post.status])}
          >
            {STATUS_LABELS[post.status]}
          </Badge>
          {post.robots === 'noindex_follow' ? (
            <Badge variant="outline" className="rounded-full">
              noindex
            </Badge>
          ) : null}
          {post.category ? (
            <Badge variant="outline" className="rounded-full">
              {post.category.name}
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-5 max-w-4xl font-heading text-4xl font-bold leading-tight text-foreground">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            {post.author?.displayName ?? 'EstateFlow'}
          </span>
          {publishedDate ? (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {publishedDate}
            </span>
          ) : null}
          {updatedDate && updatedDate !== publishedDate ? (
            <span>Aktualizacja: {updatedDate}</span>
          ) : null}
        </div>
      </header>

      <img
        src={imageUrl}
        alt={post.coverImageAlt || post.title}
        className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <BlogMarkdown
            content={post.content}
            featuredListingsSlot={
              shouldShowFeaturedListings ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
                  W tym miejscu publiczny artykuł pokaże blok wyróżnionych ofert
                  z katalogu EstateFlow.
                </div>
              ) : null
            }
          />
          <div className="mt-8">
            <ArticleCta variant={getArticleCtaVariant(post)} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <BlogTableOfContents headings={headings} />
          <PreviewSeoSummary post={post} />
        </aside>
      </div>
    </article>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/blog"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Wróć do listy wpisów
    </Link>
  );
}

function PreviewSeoSummary({ post }: { post: AdminBlogPost }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-heading text-base font-semibold">SEO</h2>
      <dl className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        <div>
          <dt className="font-semibold text-foreground">Title</dt>
          <dd>{post.seoTitle || 'Brak'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Description</dt>
          <dd>{post.seoDescription || 'Brak'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Canonical</dt>
          <dd className="break-all">
            {post.canonicalUrl || `/blog/${post.slug}`}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function getArticleCtaVariant(
  post: AdminBlogPost,
): 'register' | 'listings' | 'submit-listing' {
  const text =
    `${post.title} ${post.category?.name ?? ''} ${post.tags.join(' ')}`.toLowerCase();

  if (text.includes('sprzeda') || text.includes('wynaj')) {
    return 'submit-listing';
  }

  if (text.includes('kup') || text.includes('ofert')) {
    return 'listings';
  }

  return 'register';
}
