import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
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
});
