import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { FavoriteListingsController } from './favorite-listings.controller';
import { FavoriteListingsService } from './favorite-listings.service';

describe('FavoriteListingsController', () => {
  let controller: FavoriteListingsController;
  let service: {
    findUserFavorites: jest.Mock;
    findFavoriteListingIds: jest.Mock;
    addFavorite: jest.Mock;
    removeFavorite: jest.Mock;
  };

  beforeEach(() => {
    service = {
      findUserFavorites: jest.fn(),
      findFavoriteListingIds: jest.fn(),
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
    };
    controller = new FavoriteListingsController(
      service as unknown as FavoriteListingsService,
    );
  });

  it('delegates favorite id lookup to one bulk service call', async () => {
    service.findFavoriteListingIds.mockResolvedValue({
      listingIds: [FIRST_LISTING_ID],
    });

    await expect(
      controller.findIds(USER_ID, {
        listingIds: [FIRST_LISTING_ID, SECOND_LISTING_ID],
      }),
    ).resolves.toEqual({ listingIds: [FIRST_LISTING_ID] });

    expect(service.findFavoriteListingIds).toHaveBeenCalledTimes(1);
    expect(service.findFavoriteListingIds).toHaveBeenCalledWith(USER_ID, [
      FIRST_LISTING_ID,
      SECOND_LISTING_ID,
    ]);
  });

  it('keeps favorite id lookup authenticated', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        FavoriteListingsController.prototype.findIds,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, FavoriteListingsController),
    ).toBeUndefined();
  });

  it('keeps all favorite listing endpoints authenticated', () => {
    const protectedHandlers: Array<keyof FavoriteListingsController> = [
      'findAll',
      'findIds',
      'add',
      'remove',
    ];

    for (const handler of protectedHandlers) {
      expect(
        Reflect.getMetadata(
          IS_PUBLIC_KEY,
          FavoriteListingsController.prototype[handler],
        ),
      ).toBeUndefined();
    }

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, FavoriteListingsController),
    ).toBeUndefined();
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FIRST_LISTING_ID = '22222222-2222-4222-8222-222222222222';
const SECOND_LISTING_ID = '33333333-3333-4333-8333-333333333333';
