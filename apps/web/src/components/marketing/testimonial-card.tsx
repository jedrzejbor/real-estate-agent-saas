import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
  quote: string;
  authorName: string;
  authorRole: string;
  rating?: number;
  className?: string;
}

/** Customer testimonial card with rating stars. */
export function TestimonialCard({
  quote,
  authorName,
  authorRole,
  rating = 5,
  className,
}: TestimonialCardProps) {
  return (
    <Card
      className={cn(
        'border-[#E7E5E4] bg-white',
        'shadow-[0_1px_3px_rgba(28,25,23,0.06),0_1px_2px_rgba(28,25,23,0.04)]',
        className,
      )}
    >
      <CardContent className="pt-6">
        {/* Stars */}
        <div className="mb-4 flex gap-1">
          {Array.from({ length: rating }).map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4 fill-[#D4A853] text-[#D4A853]"
            />
          ))}
        </div>

        <blockquote className="text-sm leading-relaxed text-[#44403C]">
          &ldquo;{quote}&rdquo;
        </blockquote>

        <div className="mt-4 border-t border-[#E7E5E4] pt-4">
          <p className="text-sm font-semibold text-[#1C1917]">{authorName}</p>
          <p className="text-xs text-[#78716C]">{authorRole}</p>
        </div>
      </CardContent>
    </Card>
  );
}
