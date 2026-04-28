'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/lib/clients';

interface ClientPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** Pagination controls with page numbers for clients list. */
export function ClientPagination({
  meta,
  onPageChange,
}: ClientPaginationProps) {
  const { page, totalPages, total } = meta;

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Łącznie{' '}
        <span className="font-medium text-foreground">{total}</span>{' '}
        {total === 1
          ? 'klient'
          : total < 5
            ? 'klientów'
            : 'klientów'}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Poprzednia strona"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p as number)}
              className="min-w-[32px]"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Następna strona"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getPageNumbers(
  current: number,
  total: number,
): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
