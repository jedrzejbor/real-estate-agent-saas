/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react';
import { formatBlogDate, type PublicBlogPostListItem } from '@/lib/blog';
import { APP_NAME } from '@/lib/brand';

interface BlogPostCardProps {
  post: PublicBlogPostListItem;
  priority?: boolean;
}

export function BlogPostCard({ post, priority = false }: BlogPostCardProps) {
  const publishedDate = formatBlogDate(post.publishedAt);
  const imageUrl = post.coverImageUrl ?? '/images/hero/interior-1.jpg';
  const imageAlt = post.coverImageAlt ?? post.title;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[240px_1fr]">
      <Link href={`/blog/${post.slug}`} className="block bg-muted">
        <img
          src={imageUrl}
          alt={imageAlt}
          loading={priority ? 'eager' : 'lazy'}
          className="h-56 w-full object-cover md:h-full"
        />
      </Link>

      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          {post.category ? (
            <Link
              href={`/blog/kategoria/${post.category.slug}`}
              className="rounded-full border border-primary/20 bg-brand-emerald-light px-3 py-1 text-primary transition-colors hover:bg-brand-emerald-light"
            >
              {post.category.name}
            </Link>
          ) : null}
          {publishedDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {publishedDate}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 font-heading text-2xl font-semibold leading-tight text-foreground">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors hover:text-primary"
          >
            {post.title}
          </Link>
        </h2>

        {post.excerpt ? (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" />
            <span>{post.author?.displayName ?? APP_NAME}</span>
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Czytaj artykuł
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
