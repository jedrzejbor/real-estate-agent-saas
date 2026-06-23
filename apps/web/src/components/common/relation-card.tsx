import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface RelationCardProps {
  href: string;
  title: string;
  description?: ReactNode;
  className?: string;
}

export function RelationCard({
  href,
  title,
  description,
  className,
}: RelationCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-muted/20 p-4',
        className,
      )}
    >
      <Link
        href={href}
        className="text-sm font-medium text-primary hover:underline"
      >
        {title}
      </Link>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
