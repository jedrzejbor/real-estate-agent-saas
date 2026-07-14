import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { FavoriteListingIdsQueryDto } from './favorite-listing-query.dto';

const queryMetadata: ArgumentMetadata = {
  type: 'query',
  metatype: FavoriteListingIdsQueryDto,
};

const FIRST_LISTING_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_LISTING_ID = '22222222-2222-4222-8222-222222222222';

describe('FavoriteListingIdsQueryDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts comma-separated listing IDs and deduplicates them', async () => {
    await expect(
      pipe.transform(
        {
          listingIds: `${FIRST_LISTING_ID}, ${FIRST_LISTING_ID},${SECOND_LISTING_ID}`,
        },
        queryMetadata,
      ),
    ).resolves.toEqual({
      listingIds: [FIRST_LISTING_ID, SECOND_LISTING_ID],
    });
  });

  it('accepts repeated listingIds query params and deduplicates them', async () => {
    await expect(
      pipe.transform(
        {
          listingIds: [FIRST_LISTING_ID, FIRST_LISTING_ID, SECOND_LISTING_ID],
        },
        queryMetadata,
      ),
    ).resolves.toEqual({
      listingIds: [FIRST_LISTING_ID, SECOND_LISTING_ID],
    });
  });

  it('rejects more than 100 listing IDs', async () => {
    const listingIds = Array.from(
      { length: 101 },
      (_, index) =>
        `11111111-1111-4111-8${String(index).padStart(3, '0')}-111111111111`,
    );

    await expect(
      pipe.transform({ listingIds }, queryMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing or invalid listing IDs', async () => {
    await expect(pipe.transform({}, queryMetadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(
      pipe.transform({ listingIds: 'not-a-uuid' }, queryMetadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
