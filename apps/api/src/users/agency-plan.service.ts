import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { PlanCatalog } from '../plans';
import { Agency } from './entities';
import {
  AgencyEntitlements,
  AgencyPlanDefinition,
  AgencyPlanFeatures,
  AgencyPlanLimits,
  AgencyPlanOverrides,
} from './agency-plan.types';

export type {
  AgencyEntitlements,
  AgencyPlanDefinition,
  AgencyPlanFeatures,
  AgencyPlanLimits,
  AgencyPlanOverrides,
} from './agency-plan.types';

const PLAN_CODES = new Set<string>(Object.values(AgencyPlan));
const SYSTEM_PLAN_CODES = [
  AgencyPlan.FREE,
  AgencyPlan.STARTER,
  AgencyPlan.PROFESSIONAL,
  AgencyPlan.ENTERPRISE,
] as const;

const DEFAULT_PLAN_CATALOG_METADATA: Record<
  (typeof SYSTEM_PLAN_CODES)[number],
  {
    description: string;
    priceMonthlyPln: number;
    priceYearlyPln: number;
    sortOrder: number;
  }
> = {
  [AgencyPlan.FREE]: {
    description: 'Plan startowy dla nowych agentów i małych testów produktu.',
    priceMonthlyPln: 0,
    priceYearlyPln: 0,
    sortOrder: 0,
  },
  [AgencyPlan.STARTER]: {
    description:
      'Plan dla solo agenta, który zaczął realnie pracować na pipeline.',
    priceMonthlyPln: 9_900,
    priceYearlyPln: 99_000,
    sortOrder: 1,
  },
  [AgencyPlan.PROFESSIONAL]: {
    description:
      'Plan dla agentów i małych biur, które aktywnie publikują oferty i obsługują leady.',
    priceMonthlyPln: 24_900,
    priceYearlyPln: 249_000,
    sortOrder: 2,
  },
  [AgencyPlan.ENTERPRISE]: {
    description:
      'Plan dla większych zespołów, sieci biur i wdrożeń z indywidualnymi wymaganiami.',
    priceMonthlyPln: 0,
    priceYearlyPln: 0,
    sortOrder: 3,
  },
};

export const DEFAULT_PLAN_CATALOG: Record<AgencyPlan, AgencyPlanDefinition> = {
  [AgencyPlan.FREE]: {
    code: AgencyPlan.FREE,
    label: 'Free',
    limits: {
      activeListings: 5,
      clients: 25,
      monthlyAppointments: 20,
      users: 1,
      imagesPerListing: 15,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: false,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: false,
      customBranding: false,
      multiUser: false,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
  [AgencyPlan.STARTER]: {
    code: AgencyPlan.STARTER,
    label: 'Starter',
    limits: {
      activeListings: 25,
      clients: 250,
      monthlyAppointments: 150,
      users: 1,
      imagesPerListing: 30,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: true,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: true,
      customBranding: false,
      multiUser: false,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
  [AgencyPlan.PROFESSIONAL]: {
    code: AgencyPlan.PROFESSIONAL,
    label: 'Professional',
    limits: {
      activeListings: 200,
      clients: 2_500,
      monthlyAppointments: 1_000,
      users: 5,
      imagesPerListing: 50,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: true,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: true,
      customBranding: true,
      multiUser: true,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
  [AgencyPlan.ENTERPRISE]: {
    code: AgencyPlan.ENTERPRISE,
    label: 'Enterprise',
    limits: {
      activeListings: null,
      clients: null,
      monthlyAppointments: null,
      users: null,
      imagesPerListing: null,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: true,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: true,
      customBranding: true,
      multiUser: true,
      customDomain: true,
      apiAccess: true,
      dedicatedSupport: true,
    },
  },
  [AgencyPlan.CUSTOM]: {
    code: AgencyPlan.CUSTOM,
    label: 'Custom',
    limits: {
      activeListings: 10,
      clients: 100,
      monthlyAppointments: 50,
      users: 2,
      imagesPerListing: 20,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: true,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: true,
      customBranding: false,
      multiUser: false,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
};

@Injectable()
export class AgencyPlanService implements OnModuleInit {
  private readonly logger = new Logger(AgencyPlanService.name);
  private readonly planCatalog = new Map<AgencyPlan, AgencyPlanDefinition>();

  constructor(
    @InjectRepository(PlanCatalog)
    private readonly planCatalogRepo: Repository<PlanCatalog>,
  ) {
    this.resetCatalogToDefaults();
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSystemPlanCatalog();
    await this.refreshCatalog();
  }

  async ensureSystemPlanCatalog(): Promise<void> {
    const existingPlans = await this.planCatalogRepo.find({
      select: ['code'],
    });
    const existingCodes = new Set(existingPlans.map((plan) => plan.code));
    const missingPlans = SYSTEM_PLAN_CODES.filter(
      (code) => !existingCodes.has(code),
    );

    if (missingPlans.length === 0) {
      return;
    }

    const planRows = missingPlans.map((code) =>
      this.planCatalogRepo.create(this.buildDefaultPlanCatalogRow(code)),
    );

    await this.planCatalogRepo.save(planRows);
  }

  async refreshCatalog(): Promise<void> {
    try {
      const rows = await this.planCatalogRepo.find();
      const nextCatalog = new Map<AgencyPlan, AgencyPlanDefinition>();

      for (const row of rows) {
        const code = this.getPlanCode(row.code);

        if (code === AgencyPlan.CUSTOM || !code) {
          continue;
        }

        nextCatalog.set(code, this.normalizeCatalogRow(row, code));
      }

      for (const [code, fallback] of Object.entries(DEFAULT_PLAN_CATALOG)) {
        nextCatalog.set(
          code as AgencyPlan,
          nextCatalog.get(code as AgencyPlan) ?? fallback,
        );
      }

      this.planCatalog.clear();
      for (const [code, definition] of nextCatalog) {
        this.planCatalog.set(code, definition);
      }
    } catch (error) {
      this.resetCatalogToDefaults();
      this.logger.warn(
        `Could not load plan_catalog; using fallback plan definitions. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private buildDefaultPlanCatalogRow(
    code: (typeof SYSTEM_PLAN_CODES)[number],
  ): Partial<PlanCatalog> {
    const definition = DEFAULT_PLAN_CATALOG[code];
    const metadata = DEFAULT_PLAN_CATALOG_METADATA[code];

    return {
      code,
      label: definition.label,
      description: metadata.description,
      priceMonthlyPln: metadata.priceMonthlyPln,
      priceYearlyPln: metadata.priceYearlyPln,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      limits: definition.limits,
      features: definition.features,
      isPublic: true,
      sortOrder: metadata.sortOrder,
    };
  }

  getEntitlements(agency?: Agency | null): AgencyEntitlements {
    const plan = this.getPlanCode(agency?.plan) ?? AgencyPlan.FREE;
    const status = this.getSubscriptionStatus(agency?.subscription);
    const base = this.planCatalog.get(plan) ?? DEFAULT_PLAN_CATALOG[plan];
    const overrides = this.normalizeOverrides(agency?.planOverrides);

    return {
      plan: {
        code: plan,
        label: overrides.label ?? base.label,
        status,
      },
      limits: { ...base.limits, ...overrides.limits },
      features: { ...base.features, ...overrides.features },
    };
  }

  private resetCatalogToDefaults(): void {
    this.planCatalog.clear();

    for (const [code, definition] of Object.entries(DEFAULT_PLAN_CATALOG)) {
      this.planCatalog.set(code as AgencyPlan, definition);
    }
  }

  private normalizeCatalogRow(
    row: PlanCatalog,
    code: AgencyPlan,
  ): AgencyPlanDefinition {
    const fallback = DEFAULT_PLAN_CATALOG[code];

    return {
      code,
      label: this.normalizeLabel(row.label) ?? fallback.label,
      limits: {
        ...fallback.limits,
        ...this.pickValidLimits(row.limits),
      },
      features: {
        ...fallback.features,
        ...this.pickValidFeatures(row.features),
      },
    };
  }

  private normalizeOverrides(
    value?: AgencyPlanOverrides | null,
  ): AgencyPlanOverrides {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return {
      label: this.normalizeLabel(value.label),
      priceMonthlyPln: this.normalizePrice(value.priceMonthlyPln),
      priceYearlyPln: this.normalizePrice(value.priceYearlyPln),
      limits: this.pickValidLimits(value.limits),
      features: this.pickValidFeatures(value.features),
    };
  }

  private getPlanCode(value?: string | null): AgencyPlan | null {
    return value && PLAN_CODES.has(value) ? (value as AgencyPlan) : null;
  }

  private getSubscriptionStatus(value?: string | null): SubscriptionStatus {
    switch (value) {
      case SubscriptionStatus.TRIAL:
      case SubscriptionStatus.PAST_DUE:
      case SubscriptionStatus.CANCELED:
        return value;
      case SubscriptionStatus.ACTIVE:
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private normalizeLabel(value?: string | null): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const label = value.trim();
    return label.length > 0 ? label : undefined;
  }

  private normalizePrice(value?: number): number | undefined {
    return value !== undefined && Number.isInteger(value) && value >= 0
      ? value
      : undefined;
  }

  private pickValidLimits(
    value?: Partial<AgencyPlanLimits> | null,
  ): Partial<AgencyPlanLimits> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const limits: Partial<AgencyPlanLimits> = {};

    this.assignLimit(limits, 'activeListings', value.activeListings);
    this.assignLimit(limits, 'clients', value.clients);
    this.assignLimit(limits, 'monthlyAppointments', value.monthlyAppointments);
    this.assignLimit(limits, 'users', value.users);
    this.assignLimit(limits, 'imagesPerListing', value.imagesPerListing);

    return limits;
  }

  private assignLimit<K extends keyof AgencyPlanLimits>(
    limits: Partial<AgencyPlanLimits>,
    key: K,
    value: AgencyPlanLimits[K] | undefined,
  ): void {
    if (
      value === null ||
      (value !== undefined && Number.isInteger(value) && value >= 0)
    ) {
      limits[key] = value;
    }
  }

  private pickValidFeatures(
    value?: Partial<AgencyPlanFeatures> | null,
  ): Partial<AgencyPlanFeatures> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const features: Partial<AgencyPlanFeatures> = {};

    this.assignFeature(features, 'reportsOverview', value.reportsOverview);
    this.assignFeature(
      features,
      'reportsListingsBasic',
      value.reportsListingsBasic,
    );
    this.assignFeature(
      features,
      'reportsClientsBasic',
      value.reportsClientsBasic,
    );
    this.assignFeature(
      features,
      'reportsAppointmentsBasic',
      value.reportsAppointmentsBasic,
    );
    this.assignFeature(features, 'publicListings', value.publicListings);
    this.assignFeature(features, 'publicLeadForms', value.publicLeadForms);
    this.assignFeature(
      features,
      'agentListingMarket',
      value.agentListingMarket,
    );
    this.assignFeature(features, 'customBranding', value.customBranding);
    this.assignFeature(features, 'multiUser', value.multiUser);
    this.assignFeature(features, 'customDomain', value.customDomain);
    this.assignFeature(features, 'apiAccess', value.apiAccess);
    this.assignFeature(features, 'dedicatedSupport', value.dedicatedSupport);

    return features;
  }

  private assignFeature<K extends keyof AgencyPlanFeatures>(
    features: Partial<AgencyPlanFeatures>,
    key: K,
    value: AgencyPlanFeatures[K] | undefined,
  ): void {
    if (typeof value === 'boolean') {
      features[key] = value;
    }
  }
}
