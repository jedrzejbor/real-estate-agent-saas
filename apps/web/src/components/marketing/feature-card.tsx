import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/** Reusable feature highlight card for landing page and marketing sections. */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <Card
      className={cn(
        'border-[#E7E5E4] bg-white transition-all duration-200',
        'hover:shadow-[0_10px_25px_-5px_rgba(28,25,23,0.1),0_4px_6px_-2px_rgba(28,25,23,0.05)]',
        'hover:border-[#D6D3D1]',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ECFDF5]">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-heading text-lg font-semibold text-[#1C1917]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#78716C]">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
