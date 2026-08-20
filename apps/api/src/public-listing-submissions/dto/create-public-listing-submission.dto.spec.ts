import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { PropertyType, TransactionType } from '../../common/enums';
import {
  CreatePublicListingSubmissionDto,
  PublicSubmissionListingDto,
} from './create-public-listing-submission.dto';
import { UpdateSellerPublicListingSubmissionDto } from './update-seller-public-listing-submission.dto';

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

describe('public submission image count contract', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const createMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreatePublicListingSubmissionDto,
  };
  const updateMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: UpdateSellerPublicListingSubmissionDto,
  };
  const images = [1, 2, 3].map((index) => ({
    url: `/uploads/public-listing-submissions/image-${index}.jpg`,
    order: index - 1,
    isPrimary: index === 1,
  }));

  it('accepts a new submission with three images', async () => {
    await expect(
      pipe.transform(buildCreatePayload(images), createMetadata),
    ).resolves.toMatchObject({ images });
  });

  it('rejects a new submission with fewer than three images', async () => {
    await expect(
      pipe.transform(buildCreatePayload(images.slice(0, 2)), createMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a seller update that reduces the gallery below three images', async () => {
    await expect(
      pipe.transform({ images: images.slice(0, 2) }, updateMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  function buildCreatePayload(submissionImages: typeof images) {
    return {
      listing: {
        title: 'Przykładowa oferta',
        description: 'Kompletny opis przykładowej nieruchomości.',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        price: 500000,
        areaM2: 55,
        rooms: 3,
      },
      address: { city: 'Warszawa' },
      images: submissionImages,
      ownerName: 'Jan Kowalski',
      email: 'jan@example.com',
      phone: '500600700',
      contactConsent: true,
      termsConsent: true,
    };
  }
});
