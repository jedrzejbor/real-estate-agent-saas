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
        variant === 'muted' && 'bg-[#F5F0EB]',
        variant === 'gradient' &&
          'bg-gradient-to-b from-[#FAFAF9] to-[#F5F0EB]',
        className,
      )}
    >
      {children}
    </section>
  );
}
