import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateListingOrderDto } from './create-listing-order.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CreateListingOrderDto,
};
const baseOrder = {
  listingId: '11111111-1111-4111-8111-111111111111',
  items: [{ productCode: 'publication_60_days', quantity: 1 }],
};

describe('CreateListingOrderDto', () => {
  it('accepts minimal consumer data without a client-controlled email', async () => {
    await expect(
      pipe.transform(
        {
          ...baseOrder,
          buyer: { countryCode: 'PL', buyerType: 'consumer' },
        },
        metadata,
      ),
    ).resolves.toMatchObject({ buyer: { countryCode: 'PL' } });
  });

  it('requires company identity for a business purchase', async () => {
    await expect(
      pipe.transform(
        {
          ...baseOrder,
          buyer: { countryCode: 'PL', buyerType: 'business' },
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      pipe.transform(
        {
          ...baseOrder,
          buyer: {
            countryCode: 'PL',
            buyerType: 'business',
            companyName: 'Przykład sp. z o.o.',
            taxId: '5250000000',
          },
        },
        metadata,
      ),
    ).resolves.toMatchObject({
      buyer: { companyName: 'Przykład sp. z o.o.', taxId: '5250000000' },
    });
  });

  it('rejects invalid countries and attempts to inject an email', async () => {
    await expect(
      pipe.transform(
        {
          ...baseOrder,
          buyer: {
            countryCode: 'pl',
            buyerType: 'consumer',
            email: 'attacker@example.com',
          },
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
