import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { PropertyType, TransactionType } from '../../common/enums';
import { PublicSubmissionListingDto } from './create-public-listing-submission.dto';

const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: PublicSubmissionListingDto,
};

describe('PublicSubmissionListingDto dynamic field contract', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const requiredFieldsByType: Record<PropertyType, Record<string, number>> = {
    [PropertyType.APARTMENT]: { areaM2: 55, rooms: 3 },
    [PropertyType.HOUSE]: { areaM2: 140, plotAreaM2: 850, rooms: 5 },
    [PropertyType.LAND]: { plotAreaM2: 1200 },
    [PropertyType.COMMERCIAL]: { areaM2: 90 },
    [PropertyType.OFFICE]: { areaM2: 75 },
    [PropertyType.GARAGE]: { areaM2: 18 },
  };

  it.each(Object.values(PropertyType))(
    'accepts required fields for %s',
    async (propertyType) => {
      await expect(
        pipe.transform(buildPayload(propertyType), metadata),
      ).resolves.toMatchObject({
        propertyType,
        ...requiredFieldsByType[propertyType],
      });
    },
  );

  it.each([
    [PropertyType.APARTMENT, 'areaM2'],
    [PropertyType.APARTMENT, 'rooms'],
    [PropertyType.HOUSE, 'plotAreaM2'],
    [PropertyType.LAND, 'plotAreaM2'],
    [PropertyType.COMMERCIAL, 'areaM2'],
    [PropertyType.OFFICE, 'areaM2'],
    [PropertyType.GARAGE, 'areaM2'],
  ] as const)('rejects %s without %s', async (propertyType, missingField) => {
    const payload = buildPayload(propertyType);
    delete payload[missingField];

    await expect(pipe.transform(payload, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires a non-blank description', async () => {
    await expect(
      pipe.transform(
        { ...buildPayload(PropertyType.APARTMENT), description: '   ' },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  function buildPayload(propertyType: PropertyType): Record<string, unknown> {
    return {
      title: 'Przykładowa oferta',
      description: 'Kompletny opis przykładowej nieruchomości.',
      propertyType,
      transactionType: TransactionType.SALE,
      price: 500000,
      ...requiredFieldsByType[propertyType],
    };
  }
});
