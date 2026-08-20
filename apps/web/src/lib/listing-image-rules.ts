export const MIN_LISTING_IMAGES = 3;
export const MAX_LISTING_IMAGES = 15;

export function getListingImageCountError(imageCount: number): string | null {
  return imageCount >= MIN_LISTING_IMAGES
    ? null
    : `Dodaj co najmniej ${MIN_LISTING_IMAGES} zdjęcia`;
}

export class ListingCreationRollbackError extends Error {
  constructor(
    readonly listingId: string,
    readonly uploadError: unknown,
    readonly rollbackError: unknown,
  ) {
    super('Nie udało się dodać zdjęć ani wycofać utworzonej oferty');
    this.name = 'ListingCreationRollbackError';
  }
}

export async function createListingWithImages<
  TData,
  TFile,
  TListing extends { id: string },
>({
  data,
  files,
  create,
  upload,
  rollback,
}: {
  data: TData;
  files: readonly TFile[];
  create: (data: TData) => Promise<TListing>;
  upload: (listingId: string, files: TFile[]) => Promise<TListing>;
  rollback: (listingId: string) => Promise<void>;
}): Promise<TListing> {
  const imageError = getListingImageCountError(files.length);
  if (imageError) {
    throw new Error(imageError);
  }

  const listing = await create(data);

  try {
    return await upload(listing.id, [...files]);
  } catch (uploadError) {
    try {
      await rollback(listing.id);
    } catch (rollbackError) {
      throw new ListingCreationRollbackError(
        listing.id,
        uploadError,
        rollbackError,
      );
    }

    throw uploadError;
  }
}
