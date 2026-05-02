'use client';

import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  ImagePlus,
  Save,
  Star,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LimitUpgradeBanner } from '@/components/growth/limit-upgrade-banner';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/contexts/confirm-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  deleteListingImage,
  reorderListingImages,
  setListingPrimaryImage,
  updateListingImage,
  uploadListingImages,
  type Listing,
  type ListingImage,
} from '@/lib/listings';
import { cn } from '@/lib/utils';

interface ListingImageManagerProps {
  listing: Listing;
  onListingChange: (listing: Listing) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function ListingImageManager({
  listing,
  onListingChange,
}: ListingImageManagerProps) {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [busyImageId, setBusyImageId] = React.useState<string | null>(null);
  const [altDrafts, setAltDrafts] = React.useState<Record<string, string>>({});

  const images = React.useMemo(
    () => getOrderedImages(listing.images ?? []),
    [listing.images],
  );
  const imageLimit = user?.entitlements.limits.imagesPerListing ?? null;
  const remainingSlots =
    imageLimit === null ? null : Math.max(imageLimit - images.length, 0);
  const isAtLimit = remainingSlots !== null && remainingSlots <= 0;

  React.useEffect(() => {
    setAltDrafts(
      Object.fromEntries(
        images.map((image) => [image.id, image.altText ?? '']),
      ),
    );
  }, [images]);

  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter(validateFile);

    if (validFiles.length === 0) {
      return;
    }

    if (remainingSlots !== null && validFiles.length > remainingSlots) {
      showErrorToast({
        title: 'Limit zdjęć',
        description: `Możesz dodać jeszcze ${remainingSlots} zdjęć do tej oferty.`,
      });
      return;
    }

    try {
      setIsUploading(true);
      const updated = await uploadListingImages(listing.id, validFiles);
      onListingChange(updated);
      showSuccessToast({
        title: 'Zdjęcia dodane',
        description: `Dodano ${validFiles.length} ${
          validFiles.length === 1 ? 'zdjęcie' : 'zdjęcia'
        } do oferty.`,
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się dodać zdjęć',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetPrimary(image: ListingImage) {
    try {
      setBusyImageId(image.id);
      const updated = await setListingPrimaryImage(listing.id, image.id);
      onListingChange(updated);
      showSuccessToast({
        title: 'Zdjęcie główne ustawione',
        description: 'Publiczna oferta użyje go jako zdjęcia hero.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się ustawić zdjęcia głównego',
        description: getApiErrorMessage(error),
      });
    } finally {
      setBusyImageId(null);
    }
  }

  async function handleDelete(image: ListingImage) {
    const confirmed = await confirm({
      title: 'Usunąć zdjęcie?',
      description: image.isPrimary
        ? 'To zdjęcie jest główne. Po usunięciu system wybierze kolejne zdjęcie z galerii.'
        : 'Zdjęcie zniknie z panelu i publicznej strony oferty.',
      confirmLabel: 'Usuń zdjęcie',
      cancelLabel: 'Anuluj',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      setBusyImageId(image.id);
      const updated = await deleteListingImage(listing.id, image.id);
      onListingChange(updated);
      showSuccessToast({
        title: 'Zdjęcie usunięte',
        description: 'Galeria oferty została zaktualizowana.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się usunąć zdjęcia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setBusyImageId(null);
    }
  }

  async function handleMove(imageId: string, direction: -1 | 1) {
    const currentIndex = images.findIndex((image) => image.id === imageId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const nextOrder = images.map((image) => image.id);
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[currentIndex],
    ];

    try {
      setBusyImageId(imageId);
      const updated = await reorderListingImages(listing.id, nextOrder);
      onListingChange(updated);
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zmienić kolejności',
        description: getApiErrorMessage(error),
      });
    } finally {
      setBusyImageId(null);
    }
  }

  async function handleSaveAltText(image: ListingImage) {
    try {
      setBusyImageId(image.id);
      const updated = await updateListingImage(listing.id, image.id, {
        altText: altDrafts[image.id] ?? '',
      });
      onListingChange(updated);
      showSuccessToast({
        title: 'Opis zdjęcia zapisany',
        description: 'Tekst alternatywny został zaktualizowany.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać opisu zdjęcia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setBusyImageId(null);
    }
  }

  function validateFile(file: File): boolean {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showErrorToast({
        title: 'Nieobsługiwany format',
        description: `${file.name}: dozwolone są JPG, PNG i WebP.`,
      });
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showErrorToast({
        title: 'Plik jest za duży',
        description: `${file.name}: maksymalny rozmiar to 10 MB.`,
      });
      return false;
    }

    return true;
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Zdjęcia oferty
            </h2>
            <Badge variant={isAtLimit ? 'warning' : 'secondary'}>
              {imageLimit === null
                ? `${images.length} zdjęć`
                : `${images.length}/${imageLimit}`}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Galeria zasila publiczną stronę, SEO i podgląd udostępniania.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFilesSelected}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isAtLimit}
            className="gap-2 rounded-xl"
          >
            <ImagePlus className="h-4 w-4" />
            {isUploading ? 'Dodawanie...' : 'Dodaj zdjęcia'}
          </Button>
        </div>
      </div>

      {isAtLimit && imageLimit !== null ? (
        <div className="mt-5">
          <LimitUpgradeBanner
            resource="images"
            usage={images.length}
            limit={imageLimit}
            exceeded
            source="listing_image_manager_limit_state"
          />
        </div>
      ) : null}

      {images.length === 0 ? (
        <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <ImageIcon className="h-9 w-9 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Brak zdjęć w galerii
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Publiczna oferta użyje fallbacku, dopóki nie dodasz zdjęcia
            głównego.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {images.map((image, index) => {
            const isBusy = busyImageId === image.id;
            const altDraft = altDrafts[image.id] ?? '';
            const altChanged = altDraft !== (image.altText ?? '');

            return (
              <article
                key={image.id}
                className="overflow-hidden rounded-xl border border-border bg-white"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <img
                    src={image.url}
                    alt={image.altText || listing.title}
                    className="h-full w-full object-cover"
                  />
                  {image.isPrimary ? (
                    <Badge className="absolute left-3 top-3" variant="success">
                      Główne
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={altDraft}
                      onChange={(event) =>
                        setAltDrafts((drafts) => ({
                          ...drafts,
                          [image.id]: event.target.value,
                        }))
                      }
                      maxLength={255}
                      placeholder="Opis zdjęcia"
                      className="h-9 rounded-xl"
                    />
                    <Button
                      type="button"
                      size="icon-lg"
                      variant="outline"
                      aria-label="Zapisz opis zdjęcia"
                      disabled={isBusy || !altChanged}
                      onClick={() => handleSaveAltText(image)}
                      className="rounded-xl"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      aria-label="Przesuń zdjęcie w górę"
                      disabled={isBusy || index === 0}
                      onClick={() => handleMove(image.id, -1)}
                      className="rounded-xl"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      aria-label="Przesuń zdjęcie w dół"
                      disabled={isBusy || index === images.length - 1}
                      onClick={() => handleMove(image.id, 1)}
                      className="rounded-xl"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      aria-label="Ustaw jako zdjęcie główne"
                      disabled={isBusy || image.isPrimary}
                      onClick={() => handleSetPrimary(image)}
                      className={cn(
                        'rounded-xl',
                        image.isPrimary ? 'text-primary' : '',
                      )}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <div />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-lg"
                      aria-label="Usuń zdjęcie"
                      disabled={isBusy}
                      onClick={() => handleDelete(image)}
                      className="rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getOrderedImages(images: ListingImage[]): ListingImage[] {
  return images.slice().sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return Number(b.isPrimary) - Number(a.isPrimary);
  });
}
