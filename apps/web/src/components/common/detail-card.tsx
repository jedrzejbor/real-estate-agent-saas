import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface DetailCardProps {
  title: string;
  icon?: ElementType;
  children: ReactNode;
  className?: string;
}

export function DetailCard({
  title,
  icon: Icon,
  children,
  className,
}: DetailCardProps) {
  return (
    <section
      className={cn(
        'min-h-[185px] space-y-4 rounded-2xl border border-border bg-card p-6',
        className,
      )}
    >
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}
