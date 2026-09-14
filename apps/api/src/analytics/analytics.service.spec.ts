import {
  ListingOrderStatus,
  ListingPaymentAttemptStatus,
} from '../listing-commerce/listing-commerce.types';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('groups listing commerce telemetry under the commerce category', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { name: 'listing_quote_created', count: '3' },
        { name: 'listing_order_created', count: '2' },
        { name: 'listing_payment_event_failed', count: '1' },
      ]),
    };
    const analyticsEventRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new AnalyticsService(
      analyticsEventRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await (
      service as unknown as {
        getAnalyticsEventCategories: (from: Date) => Promise<
          Array<{
            category: string;
            count: number;
            events: Array<{ name: string; count: number }>;
          }>
        >;
      }
    ).getAnalyticsEventCategories(new Date('2026-09-01T00:00:00.000Z'));

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'commerce',
          count: 6,
          events: expect.arrayContaining([
            { name: 'listing_quote_created', count: 3 },
            { name: 'listing_order_created', count: 2 },
            { name: 'listing_payment_event_failed', count: 1 },
          ]),
        }),
      ]),
    );
  });

  it('builds marketplace funnel metrics from analytics event counts', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { name: 'listing_agent_collaboration_enabled', count: '4' },
        { name: 'agent_listing_market_viewed', count: '20' },
        { name: 'listing_agent_proposal_sent', count: '10' },
        { name: 'listing_agent_proposal_opened_by_seller', count: '5' },
        { name: 'listing_agent_proposal_accepted', count: '3' },
        { name: 'listing_agent_proposal_rejected', count: '2' },
        { name: 'agent_assignment_listing_copy_created', count: '2' },
      ]),
    };
    const analyticsEventRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new AnalyticsService(
      analyticsEventRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await (
      service as unknown as {
        getMarketplaceAnalyticsSummary: (from: Date) => Promise<{
          collaborationEnabled: number;
          marketViews: number;
          proposalsSent: number;
          proposalsOpenedBySeller: number;
          proposalsAccepted: number;
          proposalsRejected: number;
          listingCopiesCreated: number;
          sellerOpenRate: number;
          acceptanceRate: number;
          copyCreationRate: number;
        }>;
      }
    ).getMarketplaceAnalyticsSummary(new Date('2026-07-01T00:00:00.000Z'));

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'event.name IN (:...eventNames)',
      expect.objectContaining({
        eventNames: expect.arrayContaining([
          'agent_listing_market_viewed',
          'listing_agent_proposal_sent',
          'agent_assignment_listing_copy_created',
        ]),
      }),
    );
    expect(result).toMatchObject({
      collaborationEnabled: 4,
      marketViews: 20,
      proposalsSent: 10,
      proposalsOpenedBySeller: 5,
      proposalsAccepted: 3,
      proposalsRejected: 2,
      listingCopiesCreated: 2,
      sellerOpenRate: 50,
      acceptanceRate: 60,
      copyCreationRate: 67,
    });
  });

  it('builds listing commerce funnel metrics from events and durable orders', async () => {
    const analyticsQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { name: 'listing_quote_created', count: '10' },
        { name: 'listing_order_created', count: '4' },
        { name: 'listing_checkout_session_created', count: '3' },
        { name: 'listing_payment_event_processed', count: '3' },
        { name: 'listing_payment_event_failed', count: '1' },
      ]),
    };
    const orderStatusQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          status: ListingOrderStatus.PAID,
          count: '2',
          totalGross: '9800',
          discountGross: '1000',
          zeroValue: '0',
          discounted: '1',
        },
        {
          status: ListingOrderStatus.PAYMENT_FAILED,
          count: '1',
          totalGross: '4900',
          discountGross: '0',
          zeroValue: '0',
          discounted: '0',
        },
        {
          status: ListingOrderStatus.DRAFT,
          count: '1',
          totalGross: '0',
          discountGross: '4900',
          zeroValue: '1',
          discounted: '1',
        },
      ]),
    };
    const paidOrderQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        paidOrders: '2',
        grossRevenue: '9800',
      }),
    };
    const attemptStatusQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: ListingPaymentAttemptStatus.SUCCEEDED, count: '2' },
        { status: ListingPaymentAttemptStatus.FAILED, count: '1' },
      ]),
    };
    const analyticsEventRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(analyticsQueryBuilder),
    };
    const listingOrderRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(orderStatusQueryBuilder)
        .mockReturnValueOnce(paidOrderQueryBuilder),
    };
    const listingPaymentAttemptRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(attemptStatusQueryBuilder),
    };
    const service = new AnalyticsService(
      analyticsEventRepo as never,
      {} as never,
      {} as never,
      {} as never,
      listingOrderRepo as never,
      listingPaymentAttemptRepo as never,
      {} as never,
      {} as never,
    );

    const result = await (
      service as unknown as {
        getCommerceAnalyticsSummary: (from: Date) => Promise<{
          quotesCreated: number;
          ordersCreated: number;
          checkoutSessionsCreated: number;
          paidOrders: number;
          failedOrders: number;
          zeroValueOrders: number;
          discountedOrders: number;
          grossRevenueAmount: number;
          discountGrossAmount: number;
          averageOrderGrossAmount: number;
          quoteToOrderRate: number;
          orderToCheckoutRate: number;
          checkoutToPaidRate: number;
          paymentFailureRate: number;
        }>;
      }
    ).getCommerceAnalyticsSummary(new Date('2026-09-01T00:00:00.000Z'));

    expect(result).toMatchObject({
      quotesCreated: 10,
      ordersCreated: 4,
      checkoutSessionsCreated: 3,
      paidOrders: 2,
      failedOrders: 1,
      zeroValueOrders: 1,
      discountedOrders: 2,
      grossRevenueAmount: 9_800,
      discountGrossAmount: 5_900,
      averageOrderGrossAmount: 3_675,
      quoteToOrderRate: 40,
      orderToCheckoutRate: 75,
      checkoutToPaidRate: 67,
      paymentFailureRate: 25,
    });
  });
});
