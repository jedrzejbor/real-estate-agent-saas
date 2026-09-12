import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ListingProductType,
  ListingPromotionDiscountType,
} from '../listing-commerce.types';
import {
  GrantListingEntitlementDto,
  RevokeListingEntitlementDto,
} from './grant-listing-entitlement.dto';
import {
  ArchiveListingManualAdjustmentDto,
  CreateListingManualAdjustmentDto,
} from './listing-manual-adjustment.dto';

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

  it('requires a meaningful audit reason for revoke requests', async () => {
    await expect(
      pipe.transform(
        {
          reason: 'Grant przyznany omyłkowo',
        },
        metadata(RevokeListingEntitlementDto),
      ),
    ).resolves.toMatchObject({ reason: 'Grant przyznany omyłkowo' });

    await expect(
      pipe.transform({ reason: 'x' }, metadata(RevokeListingEntitlementDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CreateListingManualAdjustmentDto', () => {
  it('accepts and transforms a valid manual adjustment payload', async () => {
    await expect(
      pipe.transform(
        {
          label: 'Ręczna korekta ceny',
          reason: 'Rekompensata po kontakcie z supportem',
          discountType: ListingPromotionDiscountType.FIXED_GROSS,
          discountValue: '1000',
          maxDiscountGrossAmount: '1500',
          endsAt: '2026-09-20T10:00:00.000Z',
        },
        metadata(CreateListingManualAdjustmentDto),
      ),
    ).resolves.toMatchObject({
      label: 'Ręczna korekta ceny',
      reason: 'Rekompensata po kontakcie z supportem',
      discountType: ListingPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      maxDiscountGrossAmount: 1_500,
      endsAt: '2026-09-20T10:00:00.000Z',
    });
  });

  it('rejects invalid manual adjustment payloads', async () => {
    await expect(
      pipe.transform(
        {
          label: '',
          reason: 'x',
          discountType: 'invalid',
          discountValue: 0,
          endsAt: 'not-a-date',
        },
        metadata(CreateListingManualAdjustmentDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ArchiveListingManualAdjustmentDto', () => {
  it('requires a meaningful audit reason for archive requests', async () => {
    await expect(
      pipe.transform(
        {
          reason: 'Korekta nie jest już potrzebna',
        },
        metadata(ArchiveListingManualAdjustmentDto),
      ),
    ).resolves.toMatchObject({ reason: 'Korekta nie jest już potrzebna' });

    await expect(
      pipe.transform({ reason: 'x' }, metadata(ArchiveListingManualAdjustmentDto)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
