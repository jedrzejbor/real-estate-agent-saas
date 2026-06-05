import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { UpdatePlanDto } from './update-plan.dto';

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdatePlanDto,
};

describe('UpdatePlanDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts valid partial plan updates', async () => {
    await expect(
      pipe.transform(
        {
          priceMonthlyPln: 12900,
          limits: { activeListings: 40 },
          features: { customBranding: true },
        },
        bodyMetadata,
      ),
    ).resolves.toMatchObject({
      priceMonthlyPln: 12900,
      limits: { activeListings: 40 },
      features: { customBranding: true },
    });
  });

  it('rejects invalid limits and unknown feature keys', async () => {
    await expect(
      pipe.transform(
        {
          limits: { activeListings: -1 },
          features: { unknownFeature: true },
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows null limits but rejects null prices and feature flags', async () => {
    await expect(
      pipe.transform(
        {
          limits: { activeListings: null },
        },
        bodyMetadata,
      ),
    ).resolves.toMatchObject({
      limits: { activeListings: null },
    });

    await expect(
      pipe.transform(
        {
          priceMonthlyPln: null,
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      pipe.transform(
        {
          features: { customBranding: null },
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
