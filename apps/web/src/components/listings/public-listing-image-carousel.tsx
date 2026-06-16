'use client';

/* eslint-disable @next/next/no-img-element */
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PublicListingCarouselImage {
  id: string;
  url: string;
  altText?: string | null;
}

interface PublicListingImageCarouselProps {
  images: PublicListingCarouselImage[];
  fallbackImage: string;
  title: string;
  imageCount?: number;
  className?: string;
  renderImageLink?: (image: ReactNode) => ReactNode;
  compact?: boolean;
}

export function PublicListingImageCarousel({
  images,
  fallbackImage,
  title,
  imageCount,
  className,
  renderImageLink,
  compact = false,
}: PublicListingImageCarouselProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = images[activeImageIndex] ?? null;
  const imageUrl = activeImage?.url ?? fallbackImage;
  const hasGallery = images.length > 1;
  const total = imageCount ?? images.length;

  function showPreviousImage(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1,
    );
  }

  function showNextImage(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImageIndex((current) => (current + 1) % images.length);
  }

  const image = (
    <img
      src={imageUrl}
      alt={activeImage?.altText || title}
      className="h-full w-full object-cover"
    />
  );

  return (
    <div className={cn('group/gallery relative bg-muted', className)}>
      {renderImageLink ? renderImageLink(image) : image}

      {hasGallery ? (
        <>
          <button
            type="button"
            aria-label="Poprzednie zdjęcie"
            onClick={showPreviousImage}
            className={cn(
              'absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 group-hover/gallery:opacity-100',
              compact ? 'h-7 w-7' : 'h-8 w-8',
            )}
          >
            <ChevronLeft className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
          <button
            type="button"
            aria-label="Następne zdjęcie"
            onClick={showNextImage}
            className={cn(
              'absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 group-hover/gallery:opacity-100',
              compact ? 'h-7 w-7' : 'h-8 w-8',
            )}
          >
            <ChevronRight className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
          <div className="absolute bottom-3 left-3 flex max-w-[45%] gap-1 overflow-hidden">
            {images.slice(0, 6).map((imageItem, index) => (
              <span
                key={imageItem.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === activeImageIndex
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/55',
                )}
              />
            ))}
          </div>
        </>
      ) : null}

      {total > 1 ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white">
          {activeImageIndex + 1}/{total}
        </span>
      ) : null}
    </div>
  );
}
