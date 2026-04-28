import { cn } from '@/lib/utils';

interface HowItWorksStepProps {
  stepNumber: number;
  title: string;
  description: string;
  className?: string;
}

/** Numbered step card for "How it works" section. */
export function HowItWorksStep({
  stepNumber,
  title,
  description,
  className,
}: HowItWorksStepProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
        {stepNumber}
      </div>
      <h3 className="mt-5 font-heading text-xl font-semibold text-[#1C1917]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#78716C]">
        {description}
      </p>
    </div>
  );
}
