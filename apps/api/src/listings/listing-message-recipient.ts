import type { Listing } from './entities/listing.entity';

export const ListingMessageRecipientType = {
  OWNER_USER: 'owner_user',
} as const;

export type ListingMessageRecipientTypeValue =
  (typeof ListingMessageRecipientType)[keyof typeof ListingMessageRecipientType];

export interface ListingMessageRecipient {
  type: ListingMessageRecipientTypeValue;
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export type ListingWithMessageRecipient = Listing & {
  messageRecipient?: ListingMessageRecipient | null;
};

type ListingRecipientSource = Pick<Listing, 'ownerUser'>;

export function buildListingMessageRecipient(
  listing: ListingRecipientSource,
): ListingMessageRecipient | null {
  const owner = listing.ownerUser;

  if (!owner) {
    return null;
  }

  const name =
    [owner.agent?.firstName, owner.agent?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ') || null;

  return {
    type: ListingMessageRecipientType.OWNER_USER,
    id: owner.id,
    name,
    email: normalizeRecipientValue(owner.email),
    phone: normalizeRecipientValue(owner.agent?.phone),
  };
}

function normalizeRecipientValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
