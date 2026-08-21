import {
  ActivityAction,
  ActivityEntityType,
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';
import {
  ListingCondition,
  ListingMarketType,
} from '../common/listing-details';
import { CreateListingDto } from './dto/create-listing.dto';
import { Listing } from './entities/listing.entity';
import { ListingsService } from './listings.service';

const requiredFieldsByType: Record<PropertyType, Partial<CreateListingDto>> = {
  [PropertyType.APARTMENT]: { areaM2: 55, rooms: 3 },
  [PropertyType.HOUSE]: { areaM2: 140, plotAreaM2: 850, rooms: 5 },
  [PropertyType.LAND]: { plotAreaM2: 1200 },
  [PropertyType.COMMERCIAL]: { areaM2: 90 },
  [PropertyType.OFFICE]: { areaM2: 75 },
  [PropertyType.GARAGE]: { areaM2: 18 },
};

describe('ListingsService creation flow regression', () => {
  it.each(
    Object.values(PropertyType).flatMap((propertyType) =>
      Object.values(TransactionType).map(
        (transactionType) => [propertyType, transactionType] as const,
      ),
    ),
  )('persists %s/%s with its address and agent', async (
    propertyType,
    transactionType,
  ) => {
    const { service, listingRepo, addressRepo, activityService } =
      buildService();
    const dto = buildDto(propertyType, transactionType);

    const result = await service.create('user-1', dto);

    expect(listingRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: dto.title,
        propertyType,
        transactionType,
        agentId: 'agent-1',
        listingDetails: {
          marketType: ListingMarketType.SECONDARY,
          condition: ListingCondition.GOOD,
          priceNegotiable: true,
        },
        ...requiredFieldsByType[propertyType],
      }),
    );
    expect(listingRepo.save).toHaveBeenCalledTimes(1);
    expect(addressRepo.create).toHaveBeenCalledWith({
      city: 'Warszawa',
      listing: expect.objectContaining({ id: 'listing-1' }),
    });
    expect(addressRepo.save).toHaveBeenCalledTimes(1);
    expect(activityService.log).toHaveBeenCalledWith({
      userId: 'user-1',
      entityType: ActivityEntityType.LISTING,
      entityId: 'listing-1',
      action: ActivityAction.CREATED,
      description: 'Utworzono ofertę',
    });
    expect(result).toMatchObject({
      id: 'listing-1',
      propertyType,
      transactionType,
      agentId: 'agent-1',
    });
  });
});

function buildDto(
  propertyType: PropertyType,
  transactionType: TransactionType,
): CreateListingDto {
  return {
    title: 'Przykładowa oferta nieruchomości',
    description: 'Kompletny opis przykładowej nieruchomości.',
    propertyType,
    transactionType,
    price: 500000,
    listingDetails: {
      marketType: ListingMarketType.SECONDARY,
      condition: ListingCondition.GOOD,
      priceNegotiable: true,
    },
    address: { city: 'Warszawa' },
    ...requiredFieldsByType[propertyType],
  };
}

function buildService() {
  const listingRepo = {
    create: jest.fn((value: Partial<Listing>) => value),
    save: jest.fn(async (value: Partial<Listing>) => ({
      ...value,
      id: 'listing-1',
      status: ListingStatus.DRAFT,
    })),
  };
  const addressRepo = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn(async (value: Record<string, unknown>) => value),
  };
  const activityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ListingsService(
    listingRepo as never,
    addressRepo as never,
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
    {} as never,
    activityService as never,
    {} as never,
    {} as never,
  );
  const internals = service as unknown as {
    assertListingCreateWithinPlanLimit: (
      userId: string,
    ) => Promise<{ agent: { id: string } }>;
    findOneOrFail: (id: string) => Promise<Listing>;
    attachPublicViewCounts: (listings: Listing[]) => Promise<void>;
  };

  jest
    .spyOn(internals, 'assertListingCreateWithinPlanLimit')
    .mockResolvedValue({ agent: { id: 'agent-1' } });
  jest.spyOn(internals, 'findOneOrFail').mockImplementation(async () => {
    const saved = listingRepo.save.mock.results[0]?.value;
    return (await saved) as Listing;
  });
  jest
    .spyOn(internals, 'attachPublicViewCounts')
    .mockResolvedValue(undefined);

  return { service, listingRepo, addressRepo, activityService };
}
