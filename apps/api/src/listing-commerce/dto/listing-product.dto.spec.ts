import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ListingProductType } from '../listing-commerce.types';
import { CreateListingProductDto } from './create-listing-product.dto';
import { ListingProductActionDto } from './listing-product-action.dto';
import { UpdateListingProductDto } from './update-listing-product.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function metadata(metatype: ArgumentMetadata['metatype']): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('listing product DTOs', () => {
  it('accepts a valid gross-priced PLN product', async () => {
    await expect(
      pipe.transform(
        {
          code: 'publication_60_days',
          name: 'Publikacja ogłoszenia',
          type: ListingProductType.PUBLICATION,
          priceGrossAmount: 4900,
          currency: 'PLN',
          vatRateBasisPoints: null,
          durationDays: 60,
        },
        metadata(CreateListingProductDto),
      ),
    ).resolves.toMatchObject({
      code: 'publication_60_days',
      priceGrossAmount: 4900,
      vatRateBasisPoints: null,
    });
  });

  it('rejects invalid codes, non-PLN currency and fractional minor units', async () => {
    await expect(
      pipe.transform(
        {
          code: 'Publication 60',
          name: 'Publikacja',
          type: ListingProductType.PUBLICATION,
          priceGrossAmount: 49.5,
          currency: 'EUR',
          durationDays: 60,
        },
        metadata(CreateListingProductDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow changing immutable code or type through update DTO', async () => {
    await expect(
      pipe.transform(
        {
          code: 'different_code',
          type: ListingProductType.FEATURED,
          priceGrossAmount: 5900,
        },
        metadata(UpdateListingProductDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a meaningful reason for archive and restore operations', async () => {
    await expect(
      pipe.transform({ reason: ' ' }, metadata(ListingProductActionDto)),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      pipe.transform(
        { reason: 'Wycofanie produktu z oferty' },
        metadata(ListingProductActionDto),
      ),
    ).resolves.toMatchObject({ reason: 'Wycofanie produktu z oferty' });
  });
});
