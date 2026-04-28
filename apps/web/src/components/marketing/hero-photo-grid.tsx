import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Hero section image data. */
export interface HeroImage {
  src: string;
  alt: string;
}

interface HeroPhotoGridProps {
  images: HeroImage[];
  className?: string;
}

/**
 * Asymmetric photo grid for the hero section.
 * Displays 5 property images in a 2-column layout with varying heights.
 * - Left column:  1 tall image + 1 short image
 * - Right column: 1 short image + 1 tall image + 1 short image (offset)
 */
export function HeroPhotoGrid({ images, className }: HeroPhotoGridProps) {
  // Ensure we have at least 5 images, pad with first ones if needed
  const imgs = [
    images[0],
    images[1],
    images[2],
    images[3],
    images[4] ?? images[0],
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {/* Left column */}
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
          <Image
            src={imgs[0].src}
            alt={imgs[0].alt}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        </div>
        <div className="relative overflow-hidden rounded-xl aspect-[4/3]">
          <Image
            src={imgs[1].src}
            alt={imgs[1].alt}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        </div>
      </div>

      {/* Right column — offset upward */}
      <div className="flex flex-col gap-3 -mt-6">
        <div className="relative overflow-hidden rounded-xl aspect-[4/3]">
          <Image
            src={imgs[2].src}
            alt={imgs[2].alt}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        </div>
        <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
          <Image
            src={imgs[3].src}
            alt={imgs[3].alt}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        </div>
        <div className="relative overflow-hidden rounded-xl aspect-[4/3]">
          <Image
            src={imgs[4].src}
            alt={imgs[4].alt}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 45vw, 280px"
          />
        </div>
      </div>
    </div>
  );
}
