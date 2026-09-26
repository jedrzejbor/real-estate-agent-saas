import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import type {
  AdminListingProductChangeContract,
  AdminListingProductContract,
} from './contracts';
import type {
  CreateListingProductDto,
  UpdateListingProductDto,
} from './dto';
import {
  ListingProductCatalog,
  ListingProductChange,
} from './entities';
import {
  assertListingProductConfiguration,
  buildListingProductFulfillmentParameters,
} from './listing-commerce.policy';
import {
  ListingProductChangeAction,
  ListingProductChangeValue,
} from './listing-commerce.types';
import {
  toAdminListingProduct,
  toAdminListingProductChange,
} from './listing-product.presenter';

type ProductSnapshot = Record<string, unknown>;

@Injectable()
export class AdminListingProductsService {
  constructor(private readonly dataSource: DataSource) {}

  async findProducts(): Promise<AdminListingProductContract[]> {
    const products = await this.dataSource.getRepository(ListingProductCatalog).find({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    return products.map(toAdminListingProduct);
  }

  async findProduct(code: string): Promise<AdminListingProductContract> {
    const product = await this.findProductEntity(
      this.dataSource.manager,
      code,
    );
    return toAdminListingProduct(product);
  }

  async findHistory(
    code: string,
  ): Promise<AdminListingProductChangeContract[]> {
    const product = await this.findProductEntity(
      this.dataSource.manager,
      code,
    );
    const changes = await this.dataSource
      .getRepository(ListingProductChange)
      .find({
        where: { productId: product.id },
        order: { createdAt: 'DESC' },
      });

    return changes.map(toAdminListingProductChange);
  }

  async createProduct(
    actorUserId: string,
    dto: CreateListingProductDto,
  ): Promise<AdminListingProductContract> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const code = dto.code.trim().toLowerCase();
        const existing = await manager.findOne(ListingProductCatalog, {
          where: { code },
        });
        if (existing) {
          throw new ConflictException('Produkt o tym kodzie już istnieje');
        }

        const isActive = dto.isActive ?? true;
        const isPublic = dto.isPublic ?? isActive;
        const product = manager.create(ListingProductCatalog, {
          code,
          name: dto.name.trim(),
          description: normalizeNullableString(dto.description),
          type: dto.type,
          priceGrossAmount: dto.priceGrossAmount,
          currency: dto.currency.trim().toUpperCase(),
          vatRateBasisPoints: dto.vatRateBasisPoints ?? null,
          durationDays: dto.durationDays,
          featuredTier: normalizeNullableString(dto.featuredTier),
          priorityWeight: dto.priorityWeight ?? 0,
          isPublic,
          isActive,
          sortOrder: dto.sortOrder ?? 0,
          providerPriceReference: normalizeNullableString(
            dto.providerPriceReference,
          ),
          archivedAt: null,
        });
        this.prepareAndAssertProduct(product);

        const saved = await manager.save(product);
        await this.saveChange(
          manager,
          saved,
          actorUserId,
          ListingProductChangeAction.CREATED,
          buildChanges({}, snapshotProduct(saved)),
          dto.reason,
        );

        return toAdminListingProduct(saved);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Produkt o tym kodzie już istnieje');
      }
      throw error;
    }
  }

  async updateProduct(
    actorUserId: string,
    code: string,
    dto: UpdateListingProductDto,
  ): Promise<AdminListingProductContract> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.findProductEntity(manager, code, true);
      const before = snapshotProduct(product);

      if (dto.name !== undefined) product.name = dto.name.trim();
      if (dto.description !== undefined) {
        product.description = normalizeNullableString(dto.description);
      }
      if (dto.priceGrossAmount !== undefined) {
        product.priceGrossAmount = dto.priceGrossAmount;
      }
      if (dto.currency !== undefined) {
        product.currency = dto.currency.trim().toUpperCase();
      }
      if (dto.vatRateBasisPoints !== undefined) {
        product.vatRateBasisPoints = dto.vatRateBasisPoints;
      }
      if (dto.durationDays !== undefined) {
        product.durationDays = dto.durationDays;
      }
      if (dto.featuredTier !== undefined) {
        product.featuredTier = normalizeNullableString(dto.featuredTier);
      }
      if (dto.priorityWeight !== undefined) {
        product.priorityWeight = dto.priorityWeight;
      }
      if (dto.isActive !== undefined) {
        product.isActive = dto.isActive;
        if (!dto.isActive && dto.isPublic === undefined) {
          product.isPublic = false;
        }
      }
      if (dto.isPublic !== undefined) product.isPublic = dto.isPublic;
      if (dto.sortOrder !== undefined) product.sortOrder = dto.sortOrder;
      if (dto.providerPriceReference !== undefined) {
        product.providerPriceReference = normalizeNullableString(
          dto.providerPriceReference,
        );
      }

      this.prepareAndAssertProduct(product);
      const changes = buildChanges(before, snapshotProduct(product));
      if (changes.length === 0) {
        return toAdminListingProduct(product);
      }

      const saved = await manager.save(product);
      await this.saveChange(
        manager,
        saved,
        actorUserId,
        ListingProductChangeAction.UPDATED,
        changes,
        dto.reason,
      );

      return toAdminListingProduct(saved);
    });
  }

  async archiveProduct(
    actorUserId: string,
    code: string,
    reason: string,
  ): Promise<AdminListingProductContract> {
    const normalizedReason = normalizeRequiredReason(reason);
    return this.dataSource.transaction(async (manager) => {
      const product = await this.findProductEntity(manager, code, true);
      if (product.archivedAt) return toAdminListingProduct(product);

      const before = snapshotProduct(product);
      product.archivedAt = new Date();
      product.isActive = false;
      product.isPublic = false;
      this.prepareAndAssertProduct(product);

      const saved = await manager.save(product);
      await this.saveChange(
        manager,
        saved,
        actorUserId,
        ListingProductChangeAction.ARCHIVED,
        buildChanges(before, snapshotProduct(saved)),
        normalizedReason,
      );

      return toAdminListingProduct(saved);
    });
  }

  async restoreProduct(
    actorUserId: string,
    code: string,
    reason: string,
  ): Promise<AdminListingProductContract> {
    const normalizedReason = normalizeRequiredReason(reason);
    return this.dataSource.transaction(async (manager) => {
      const product = await this.findProductEntity(manager, code, true);
      if (!product.archivedAt) return toAdminListingProduct(product);

      const before = snapshotProduct(product);
      product.archivedAt = null;
      product.isActive = true;
      product.isPublic = false;
      this.prepareAndAssertProduct(product);

      const saved = await manager.save(product);
      await this.saveChange(
        manager,
        saved,
        actorUserId,
        ListingProductChangeAction.RESTORED,
        buildChanges(before, snapshotProduct(saved)),
        normalizedReason,
      );

      return toAdminListingProduct(saved);
    });
  }

  private async findProductEntity(
    manager: EntityManager,
    rawCode: string,
    lock = false,
  ): Promise<ListingProductCatalog> {
    const code = rawCode.trim().toLowerCase();
    const product = await manager.findOne(ListingProductCatalog, {
      where: { code },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!product) throw new NotFoundException('Produkt nie istnieje');
    return product;
  }

  private prepareAndAssertProduct(product: ListingProductCatalog): void {
    product.name = product.name.trim();
    if (!product.name) {
      throw new BadRequestException('Nazwa produktu nie może być pusta');
    }
    product.currency = product.currency.trim().toUpperCase();
    product.featuredTier = normalizeNullableString(product.featuredTier);
    product.fulfillmentParameters = buildListingProductFulfillmentParameters(
      product,
    );

    try {
      assertListingProductConfiguration(product);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async saveChange(
    manager: EntityManager,
    product: ListingProductCatalog,
    actorUserId: string,
    action: ListingProductChangeAction,
    changes: ListingProductChangeValue[],
    reason?: string | null,
  ): Promise<void> {
    const change = manager.create(ListingProductChange, {
      productId: product.id,
      actorUserId,
      action,
      changes,
      reason: normalizeNullableString(reason),
    });
    await manager.save(change);
  }
}

function snapshotProduct(product: ListingProductCatalog): ProductSnapshot {
  return {
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    type: product.type,
    priceGrossAmount: product.priceGrossAmount,
    currency: product.currency,
    vatRateBasisPoints: product.vatRateBasisPoints ?? null,
    durationDays: product.durationDays,
    featuredTier: product.featuredTier ?? null,
    priorityWeight: product.priorityWeight,
    fulfillmentParameters: product.fulfillmentParameters,
    isPublic: product.isPublic,
    isActive: product.isActive,
    sortOrder: product.sortOrder,
    providerPriceReference: product.providerPriceReference ?? null,
    archivedAt: product.archivedAt?.toISOString() ?? null,
  };
}

function buildChanges(
  before: ProductSnapshot,
  after: ProductSnapshot,
): ListingProductChangeValue[] {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields]
    .filter(
      (field) =>
        JSON.stringify(before[field] ?? null) !==
        JSON.stringify(after[field] ?? null),
    )
    .map((field) => ({
      field,
      oldValue: before[field] ?? null,
      newValue: after[field] ?? null,
    }));
}

function normalizeNullableString(value?: string | null): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredReason(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 3) {
    throw new BadRequestException('Powód musi zawierać co najmniej 3 znaki');
  }
  return normalized;
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  return (error.driverError as { code?: string } | undefined)?.code === '23505';
}
