'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsEventName, trackPublicListingEvent } from '@/lib/analytics';
import type { ListingImage } from '@/lib/listings';
import { cn } from '@/lib/utils';

interface PublicListingGalleryProps {
  slug: string;
  listingId: string;
  listingTitle: string;
  images: ListingImage[];
}

export function PublicListingGallery({
  slug,
  listingId,
  listingTitle,
  images,
}: PublicListingGalleryProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const imageCount = images.length;
  const activeImage = activeIndex !== null ? images[activeIndex] : null;
  const canNavigate = imageCount > 1;

  React.useEffect(() => {
    if (activeIndex === null) return;

    trackPublicListingEvent({
      slug,
      name: AnalyticsEventName.PUBLIC_LISTING_GALLERY_IMAGE_VIEWED,
      properties: {
        listingId,
        imageId: images[activeIndex]?.id ?? null,
        imageIndex: activeIndex + 1,
        imageCount,
      },
    });
  }, [activeIndex, imageCount, images, listingId, slug]);

  React.useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveIndex(null);
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) =>
          current === null ? current : getPreviousIndex(current, imageCount),
        );
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((current) =>
          current === null ? current : getNextIndex(current, imageCount),
        );
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, imageCount]);

  if (imageCount === 0) {
    return null;
  }

  function openGallery(index: number) {
    setActiveIndex(index);
    trackPublicListingEvent({
      slug,
      name: AnalyticsEventName.PUBLIC_LISTING_GALLERY_OPENED,
      properties: {
        listingId,
        imageId: images[index]?.id ?? null,
        imageIndex: index + 1,
        imageCount,
      },
    });
  }

  function showPrevious() {
    setActiveIndex((current) =>
      current === null ? current : getPreviousIndex(current, imageCount),
    );
  }

  function showNext() {
    setActiveIndex((current) =>
      current === null ? current : getNextIndex(current, imageCount),
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Galeria</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {imageCount} {imageCount === 1 ? 'zdjęcie' : 'zdjęć'} oferty
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={() => openGallery(0)}
        >
          <Maximize2 className="h-4 w-4" />
          Otwórz galerię
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <GalleryTile
          image={images[0]}
          index={0}
          title={listingTitle}
          large
          onOpen={openGallery}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {images.slice(1, 5).map((image, index) => (
            <GalleryTile
              key={image.id}
              image={image}
              index={index + 1}
              title={listingTitle}
              remainingCount={
                index === Math.min(images.length - 2, 3) && images.length > 5
                  ? images.length - 5
                  : 0
              }
              onOpen={openGallery}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => openGallery(index)}
            className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`Otwórz zdjęcie ${index + 1} z ${imageCount}`}
          >
            <img
              src={image.url}
              alt={image.altText || listingTitle}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {activeImage && activeIndex !== null ? (
        <div
          className="fixed inset-0 z-50 bg-stone-950/95 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria zdjęć oferty"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Zamknij galerię"
            onClick={() => setActiveIndex(null)}
          />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Images className="h-5 w-5 shrink-0 text-white/70" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{listingTitle}</p>
                  <p className="text-xs text-white/65">
                    {activeIndex + 1} / {imageCount}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full text-white hover:bg-white/15 hover:text-white"
                onClick={() => setActiveIndex(null)}
                aria-label="Zamknij galerię"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
              {canNavigate ? (
                <GalleryNavButton
                  direction="previous"
                  onClick={showPrevious}
                  className="left-3 sm:left-5"
                />
              ) : null}

              <img
                src={activeImage.url}
                alt={activeImage.altText || listingTitle}
                className="max-h-full max-w-full rounded-xl object-contain"
              />

              {canNavigate ? (
                <GalleryNavButton
                  direction="next"
                  onClick={showNext}
                  className="right-3 sm:right-5"
                />
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 sm:px-6">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'h-16 w-24 shrink-0 overflow-hidden rounded-xl border bg-white/5 focus:outline-none focus:ring-2 focus:ring-white',
                    index === activeIndex
                      ? 'border-white'
                      : 'border-white/20 opacity-70 hover:opacity-100',
                  )}
                  aria-label={`Pokaż zdjęcie ${index + 1} z ${imageCount}`}
                >
                  <img
                    src={image.url}
                    alt={image.altText || listingTitle}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GalleryTile({
  image,
  index,
  title,
  large,
  remainingCount = 0,
  onOpen,
}: {
  image: ListingImage;
  index: number;
  title: string;
  large?: boolean;
  remainingCount?: number;
  onOpen: (index: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted text-left focus:outline-none focus:ring-2 focus:ring-primary',
        large ? 'aspect-[4/3] lg:aspect-[16/10]' : 'aspect-[4/3]',
      )}
      aria-label={`Otwórz zdjęcie ${index + 1}`}
    >
      <img
        src={image.url}
        alt={image.altText || title}
        loading={index === 0 ? 'eager' : 'lazy'}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {remainingCount > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
          +{remainingCount} zdjęć
        </div>
      ) : null}
      <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {index + 1}
      </div>
    </button>
  );
}

function GalleryNavButton({
  direction,
  onClick,
  className,
}: {
  direction: 'previous' | 'next';
  onClick: () => void;
  className?: string;
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;
  const label =
    direction === 'previous' ? 'Poprzednie zdjęcie' : 'Następne zdjęcie';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'absolute top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full bg-black/35 text-white backdrop-blur hover:bg-white/15 hover:text-white',
        className,
      )}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
}

function getPreviousIndex(current: number, imageCount: number): number {
  return (current - 1 + imageCount) % imageCount;
}

function getNextIndex(current: number, imageCount: number): number {
  return (current + 1) % imageCount;
}
