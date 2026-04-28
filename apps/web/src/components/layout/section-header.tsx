import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}

/** Reusable section heading with optional badge, title, and description. */
export function SectionHeader({
  badge,
  title,
  description,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-12',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {badge && (
        <Badge variant="brand" className="mb-4 font-semibold tracking-wide">
          {badge}
        </Badge>
      )}
      <h2 className="font-heading text-3xl font-bold tracking-tight text-[#1C1917] lg:text-4xl">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-lg text-[#78716C]',
            align === 'center' && 'mx-auto max-w-2xl',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
