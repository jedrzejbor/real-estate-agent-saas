import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 'h-6 w-6', text: 'text-lg' },
  md: { icon: 'h-8 w-8', text: 'text-xl' },
  lg: { icon: 'h-10 w-10', text: 'text-2xl' },
} as const;

/** EstateFlow brand logo — reusable across navbar, sidebar, footer, etc. */
export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Building2 className={cn(s.icon, 'text-primary')} />
      {showText && (
        <span className={cn(s.text, 'font-heading font-bold text-[#1C1917]')}>
          EstateFlow
        </span>
      )}
    </div>
  );
}
