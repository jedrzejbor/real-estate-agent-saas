import { Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts promotion codes from monitoring context recursively', () => {
    const service = new MonitoringService({
      get: jest.fn(),
    } as never);

    service.recordSuccess('listing_entitlements', 'promotion_context_test', {
      listingId: 'listing-1',
      promotionCode: 'START10',
      nested: {
        promoCode: 'SECRET20',
        couponCode: 'COUPON30',
        safe: 'visible',
      },
    });

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const line = loggerSpy.mock.calls[0][0] as string;

    expect(line).toContain('listing-1');
    expect(line).toContain('visible');
    expect(line).not.toContain('START10');
    expect(line).not.toContain('SECRET20');
    expect(line).not.toContain('COUPON30');
    expect(JSON.parse(line).context).toEqual({
      listingId: 'listing-1',
      nested: { safe: 'visible' },
    });
  });
});
