import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateListingQuoteDto } from './create-listing-quote.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CreateListingQuoteDto,
};

describe('CreateListingQuoteDto', () => {
  it('accepts product selection without any client monetary fields', async () => {
    await expect(
      pipe.transform(
        {
          listingId: '11111111-1111-4111-8111-111111111111',
          items: [{ productCode: 'publication_60_days', quantity: 1 }],
        },
        metadata,
      ),
    ).resolves.toMatchObject({
      items: [{ productCode: 'publication_60_days', quantity: 1 }],
    });
  });

  it.each([
    { items: [] },
    { items: [{ productCode: 'Publication 60', quantity: 1 }] },
    { items: [{ productCode: 'publication_60_days', quantity: 2 }] },
    {
      items: [
        {
          productCode: 'publication_60_days',
          quantity: 1,
          unitGrossAmount: 1,
        },
      ],
    },
  ])('rejects invalid or client-priced item input %#', async (invalid) => {
    await expect(
      pipe.transform(
        {
          listingId: '11111111-1111-4111-8111-111111111111',
          ...invalid,
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
