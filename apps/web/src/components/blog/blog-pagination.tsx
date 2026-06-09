import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBlogPageHref, type PaginationMeta } from '@/lib/blog';

interface BlogPaginationProps {
  meta: PaginationMeta;
  basePath?: string;
}

export function BlogPagination({
  meta,
  basePath = '/blog',
}: BlogPaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const previousPage = Math.max(1, meta.page - 1);
  const nextPage = Math.min(meta.totalPages, meta.page + 1);

  return (
    <nav
      aria-label="Paginacja wpisów blogowych"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">
        Strona {meta.page} z {meta.totalPages}
      </p>
      <div className="flex gap-2">
        <PaginationLink
          href={getBlogPageHref(previousPage, basePath)}
          disabled={meta.page <= 1}
          label="Poprzednia"
          direction="previous"
        />
        <PaginationLink
          href={getBlogPageHref(nextPage, basePath)}
          disabled={meta.page >= meta.totalPages}
          label="Następna"
          direction="next"
        />
      </div>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  label,
  direction,
}: {
  href: string;
  disabled: boolean;
  label: string;
  direction: 'previous' | 'next';
}) {
  const className =
    'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors';

  if (disabled) {
    return (
      <span
        className={`${className} cursor-not-allowed text-muted-foreground opacity-50`}
      >
        {direction === 'previous' ? <ChevronLeft className="h-4 w-4" /> : null}
        {label}
        {direction === 'next' ? <ChevronRight className="h-4 w-4" /> : null}
      </span>
    );
  }

  return (
    <Link href={href} className={`${className} hover:bg-muted`}>
      {direction === 'previous' ? <ChevronLeft className="h-4 w-4" /> : null}
      {label}
      {direction === 'next' ? <ChevronRight className="h-4 w-4" /> : null}
    </Link>
  );
}
