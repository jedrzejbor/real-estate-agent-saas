import {
  buildListingMessageRecipient,
  ListingMessageRecipientType,
} from './listing-message-recipient';
import type { Listing } from './entities/listing.entity';

describe('buildListingMessageRecipient', () => {
  it('returns null when listing has no owner user', () => {
    expect(buildListingMessageRecipient({ ownerUser: null })).toBeNull();
  });

  it('returns a minimal owner contact snapshot', () => {
    const recipient = buildListingMessageRecipient({
      ownerUser: {
        id: 'user-1',
        email: ' owner@example.com ',
        role: 'viewer',
        passwordHash: 'secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        agent: {
          firstName: ' Anna ',
          lastName: ' Kowalska ',
          phone: ' +48123123123 ',
        },
      },
    } as unknown as Pick<Listing, 'ownerUser'>);

    expect(recipient).toEqual({
      type: ListingMessageRecipientType.OWNER_USER,
      id: 'user-1',
      name: 'Anna Kowalska',
      email: 'owner@example.com',
      phone: '+48123123123',
    });
    expect(recipient).not.toHaveProperty('role');
    expect(recipient).not.toHaveProperty('passwordHash');
    expect(recipient).not.toHaveProperty('isActive');
  });

  it('uses nulls for empty optional contact fields', () => {
    const recipient = buildListingMessageRecipient({
      ownerUser: {
        id: 'user-1',
        email: ' ',
        agent: {
          firstName: '',
          lastName: null,
          phone: ' ',
        },
      },
    } as unknown as Pick<Listing, 'ownerUser'>);

    expect(recipient).toMatchObject({
      id: 'user-1',
      name: null,
      email: null,
      phone: null,
    });
  });
});
