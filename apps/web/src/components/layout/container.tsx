import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/** Reusable max-width container (1280px) with responsive horizontal padding. */
export function Container({
  children,
  className,
  as: Component = 'div',
}: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full max-w-[1280px] px-6', className)}>
      {children}
    </Component>
  );
}
