import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  name: string;
  price: number;
  period?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel?: string;
  className?: string;
}

/** Pricing plan card with feature list and CTA. */
export function PricingCard({
  name,
  price,
  period = '/mies.',
  description,
  features,
  isPopular = false,
  ctaLabel = 'Wybierz plan',
  className,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        'relative border-[#E7E5E4] bg-white transition-all duration-200',
        isPopular &&
          'border-primary shadow-[0_10px_25px_-5px_rgba(28,25,23,0.1),0_4px_6px_-2px_rgba(28,25,23,0.05)]',
        className,
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
          Najpopularniejszy
        </Badge>
      )}

      <CardHeader className="text-center">
        <h3 className="font-heading text-lg font-semibold text-[#1C1917]">
          {name}
        </h3>
        <p className="text-sm text-[#78716C]">{description}</p>
        <div className="mt-4">
          <span className="font-heading text-4xl font-bold text-[#1C1917]">
            {price}
          </span>
          <span className="ml-1 text-sm text-[#78716C]">PLN{period}</span>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="mb-6 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-[#44403C]">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            'w-full rounded-full',
            isPopular
              ? 'bg-primary text-white hover:bg-[#047857]'
              : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-[#F5F0EB]',
          )}
          variant={isPopular ? 'default' : 'outline'}
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
