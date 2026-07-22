import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { AgencyPlan } from '../../common/enums';
import { UpdateAgencyPlanDto } from './update-agency-plan.dto';

const bodyMetadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateAgencyPlanDto,
};

describe('UpdateAgencyPlanDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts custom plan overrides with nullable limits', async () => {
    await expect(
      pipe.transform(
        {
          plan: AgencyPlan.CUSTOM,
          planOverrides: {
            label: 'Plan Premium',
            limits: { activeListings: null },
            features: { customBranding: true, agentListingMarket: true },
          },
        },
        bodyMetadata,
      ),
    ).resolves.toMatchObject({
      plan: AgencyPlan.CUSTOM,
      planOverrides: {
        label: 'Plan Premium',
        limits: { activeListings: null },
        features: { customBranding: true, agentListingMarket: true },
      },
    });
  });

  it('rejects unknown override keys and null feature flags', async () => {
    await expect(
      pipe.transform(
        {
          plan: AgencyPlan.CUSTOM,
          planOverrides: {
            limits: { activeListing: 10 },
          },
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      pipe.transform(
        {
          plan: AgencyPlan.CUSTOM,
          planOverrides: {
            features: { customBranding: null },
          },
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid plan codes', async () => {
    await expect(
      pipe.transform(
        {
          plan: 'unknown',
        },
        bodyMetadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
