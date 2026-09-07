import { validate } from 'class-validator';
import { AnalyticsService } from './analytics.service';
import {
  CreatePublicPricingAnalyticsEventDto,
  PUBLIC_PRICING_ANALYTICS_EVENT_NAMES,
} from './dto/create-analytics-event.dto';

describe('public pricing analytics', () => {
  it.each(PUBLIC_PRICING_ANALYTICS_EVENT_NAMES)(
    'accepts the allow-listed %s event',
    async (name) => {
      const dto = Object.assign(new CreatePublicPricingAnalyticsEventDto(), {
        name,
        path: '/cennik?dla=prywatnych',
        properties: { surface: 'full' },
      });

      expect(await validate(dto)).toHaveLength(0);
    },
  );

  it('rejects events outside the public pricing allow-list', async () => {
    const dto = Object.assign(new CreatePublicPricingAnalyticsEventDto(), {
      name: 'signup_completed',
    });

    expect(await validate(dto)).toEqual([
      expect.objectContaining({ property: 'name' }),
    ]);
  });

  it('stores anonymous pricing events without user or agency identifiers', async () => {
    const createdAt = new Date('2026-09-07T12:00:00.000Z');
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'event-id', createdAt })),
    };
    const monitoring = {
      monitor: jest.fn(
        async (_input: unknown, operation: () => Promise<unknown>) => operation(),
      ),
    };
    const service = new AnalyticsService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      monitoring as never,
    );

    const result = await service.trackPublicPricing({
      name: 'private_pricing_viewed',
      path: '/cennik?dla=prywatnych',
      properties: { surface: 'full' },
    });

    expect(repository.create).toHaveBeenCalledWith({
      name: 'private_pricing_viewed',
      userId: null,
      agentId: null,
      agencyId: null,
      planCode: null,
      path: '/cennik?dla=prywatnych',
      properties: { surface: 'full' },
    });
    expect(result).toEqual({
      id: 'event-id',
      name: 'private_pricing_viewed',
      createdAt,
    });
  });
});
