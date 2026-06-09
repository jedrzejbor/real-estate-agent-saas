import { cn } from '@/lib/utils';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Background variant */
  variant?: 'default' | 'muted' | 'gradient';
}

/** Reusable page section with consistent vertical spacing. */
export function Section({
  children,
  className,
  id,
  variant = 'default',
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 lg:py-24',
        variant === 'muted' && 'bg-muted',
        variant === 'gradient' &&
          'bg-gradient-to-b from-background to-muted',
        className,
      )}
    >
      {children}
    </section>
  );
}
