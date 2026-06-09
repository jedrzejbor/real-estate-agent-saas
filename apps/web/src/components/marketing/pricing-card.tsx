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
        'relative flex h-full flex-col overflow-visible border-border bg-card transition-all duration-200',
        isPopular &&
          '-mt-4 pb-4 border-primary shadow-[0_10px_25px_-5px_rgba(28,25,23,0.1),0_4px_6px_-2px_rgba(28,25,23,0.05)]',
        className,
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary px-3 py-1 text-white shadow-sm">
          Najpopularniejszy
        </Badge>
      )}

      <CardHeader className="text-center">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <span className="font-heading text-4xl font-bold text-foreground">
            {price}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">PLN{period}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <ul className="mb-6 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            'mt-auto w-full rounded-full',
            isPopular
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'border-border bg-card text-foreground hover:bg-muted',
          )}
          variant={isPopular ? 'default' : 'outline'}
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
