import { ListingPublicationStatus, ListingStatus } from '../common/enums';
import { ListingsService } from './listings.service';

describe('ListingsService private seller publish guard', () => {
  it('blocks legacy listing publish for private seller listings when checkout is enabled', async () => {
    const listingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        ownerUserId: '22222222-2222-2222-2222-222222222222',
        agentId: '33333333-3333-3333-3333-333333333333',
        title: 'Mieszkanie testowe',
        status: ListingStatus.DRAFT,
        publicationStatus: ListingPublicationStatus.DRAFT,
        images: [],
      }),
      save: jest.fn(),
    };
    const usersService = {
      getAgencyAccessContext: jest.fn(),
      resolveAgentForUser: jest.fn(),
    };
    const monitoringService = {
      monitor: jest
        .fn()
        .mockImplementation(
          async (_context: unknown, callback: () => Promise<unknown>) =>
            callback(),
        ),
    };
    const releaseFlagsService = {
      getFlags: jest
        .fn()
        .mockReturnValue({ privateListingCheckoutEnabled: true }),
    };

    const service = new ListingsService(
      listingRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      usersService as never,
      {} as never,
      {} as never,
      {} as never,
      monitoringService as never,
      undefined,
      undefined,
      undefined,
      releaseFlagsService as never,
    );

    await expect(
      service.publish(
        '11111111-1111-1111-1111-111111111111',
        '44444444-4444-4444-4444-444444444444',
      ),
    ).rejects.toThrow(
      'Publikacja ogłoszenia prywatnego wymaga aktywnego pakietu publikacji',
    );
    expect(usersService.getAgencyAccessContext).not.toHaveBeenCalled();
    expect(usersService.resolveAgentForUser).not.toHaveBeenCalled();
    expect(listingRepo.save).not.toHaveBeenCalled();
  });
});
