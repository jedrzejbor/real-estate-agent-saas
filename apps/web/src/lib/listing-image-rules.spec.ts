import {
  createListingWithImages,
  getListingImageCountError,
} from './listing-image-rules';

describe('listing image rules', () => {
  it('requires at least three images', () => {
    expect(getListingImageCountError(2)).toBe('Dodaj co najmniej 3 zdjęcia');
    expect(getListingImageCountError(3)).toBeNull();
  });

  it('creates the listing and uploads all selected images', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'listing-1' });
    const upload = jest.fn().mockResolvedValue({ id: 'listing-1' });
    const rollback = jest.fn().mockResolvedValue(undefined);

    await expect(
      createListingWithImages({
        data: { title: 'Oferta' },
        files: ['1.jpg', '2.jpg', '3.jpg'],
        create,
        upload,
        rollback,
      }),
    ).resolves.toEqual({ id: 'listing-1' });

    expect(create).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith('listing-1', [
      '1.jpg',
      '2.jpg',
      '3.jpg',
    ]);
    expect(rollback).not.toHaveBeenCalled();
  });

  it('does not create a listing when there are fewer than three images', async () => {
    const create = jest.fn();

    await expect(
      createListingWithImages({
        data: { title: 'Oferta' },
        files: ['1.jpg', '2.jpg'],
        create,
        upload: jest.fn(),
        rollback: jest.fn(),
      }),
    ).rejects.toThrow('Dodaj co najmniej 3 zdjęcia');

    expect(create).not.toHaveBeenCalled();
  });

  it('deletes a newly created draft when image upload fails', async () => {
    const uploadError = new Error('upload failed');
    const rollback = jest.fn().mockResolvedValue(undefined);

    await expect(
      createListingWithImages({
        data: { title: 'Oferta' },
        files: ['1.jpg', '2.jpg', '3.jpg'],
        create: jest.fn().mockResolvedValue({ id: 'listing-1' }),
        upload: jest.fn().mockRejectedValue(uploadError),
        rollback,
      }),
    ).rejects.toBe(uploadError);

    expect(rollback).toHaveBeenCalledWith('listing-1');
  });

  it('returns the draft id when upload and rollback both fail', async () => {
    await expect(
      createListingWithImages({
        data: { title: 'Oferta' },
        files: ['1.jpg', '2.jpg', '3.jpg'],
        create: jest.fn().mockResolvedValue({ id: 'listing-1' }),
        upload: jest.fn().mockRejectedValue(new Error('upload failed')),
        rollback: jest.fn().mockRejectedValue(new Error('rollback failed')),
      }),
    ).rejects.toMatchObject({
      name: 'ListingCreationRollbackError',
      listingId: 'listing-1',
    });
  });
});
