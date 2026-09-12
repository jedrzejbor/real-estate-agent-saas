import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ListingProductType } from '../listing-commerce.types';
import { GrantListingEntitlementDto } from './grant-listing-entitlement.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function metadata(metatype: ArgumentMetadata['metatype']): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('GrantListingEntitlementDto', () => {
  it('accepts a valid admin publication grant', async () => {
    await expect(
      pipe.transform(
        {
          productType: ListingProductType.PUBLICATION,
          durationDays: '60',
          reason: 'Rekompensata po zgłoszeniu klienta',
        },
        metadata(GrantListingEntitlementDto),
      ),
    ).resolves.toMatchObject({
      productType: ListingProductType.PUBLICATION,
      durationDays: 60,
      reason: 'Rekompensata po zgłoszeniu klienta',
    });
  });

  it('accepts a valid admin featured grant', async () => {
    await expect(
      pipe.transform(
        {
          productType: ListingProductType.FEATURED,
          durationDays: 7,
          reason: 'Promocyjne wyróżnienie po kontakcie z supportem',
          featuredTier: 'standard',
          priorityWeight: '100',
        },
        metadata(GrantListingEntitlementDto),
      ),
    ).resolves.toMatchObject({
      productType: ListingProductType.FEATURED,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });
  });

  it('rejects invalid grant payloads', async () => {
    await expect(
      pipe.transform(
        {
          productType: 'invalid',
          durationDays: 0,
          reason: 'ok',
          unknown: true,
        },
        metadata(GrantListingEntitlementDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a featured tier for featured grants', async () => {
    await expect(
      pipe.transform(
        {
          productType: ListingProductType.FEATURED,
          durationDays: 7,
          reason: 'Promocyjne wyróżnienie po kontakcie z supportem',
        },
        metadata(GrantListingEntitlementDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
