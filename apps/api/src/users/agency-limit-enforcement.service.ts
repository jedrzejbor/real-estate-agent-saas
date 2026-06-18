import { Injectable } from '@nestjs/common';
import type { AgencyEntitlements } from './agency-plan.types';
import type { AgencyUsageSummary } from './users.service';

export type AgencyLimitResource =
  | 'activeListings'
  | 'clients'
  | 'monthlyAppointments'
  | 'users';

export type AgencyLimitWorkspaceStatus =
  | 'within_limit'
  | 'near_limit'
  | 'over_limit_grace'
  | 'over_limit_enforced';

export type AgencyLimitEnforcementAction =
  | 'none'
  | 'warn'
  | 'grace'
  | 'block_new_usage'
  | 'enforce_existing_usage';

export interface AgencyLimitGracePeriod {
  startedAt?: Date | string | null;
  endsAt?: Date | string | null;
}

export interface AgencyLimitEvaluationOptions {
  gracePeriod?: AgencyLimitGracePeriod | null;
  nearLimitThreshold?: number;
  now?: Date;
}

export interface AgencyLimitResourceState {
  resource: AgencyLimitResource;
  usage: number;
  limit: number | null;
  remaining: number | null;
  usageRatio: number | null;
  isUnlimited: boolean;
  isNearLimit: boolean;
  isOverLimit: boolean;
  isInGracePeriod: boolean;
  enforcementAction: AgencyLimitEnforcementAction;
}

export interface AgencyLimitEnforcementSummary {
  planCode: AgencyEntitlements['plan']['code'];
  subscriptionStatus: AgencyEntitlements['plan']['status'];
  status: AgencyLimitWorkspaceStatus;
  hasLimitedResources: boolean;
  hasNearLimitResources: boolean;
  hasOverLimitResources: boolean;
  isInGracePeriod: boolean;
  resources: Record<AgencyLimitResource, AgencyLimitResourceState>;
}

const LIMIT_RESOURCES: AgencyLimitResource[] = [
  'activeListings',
  'clients',
  'monthlyAppointments',
  'users',
];

const DEFAULT_NEAR_LIMIT_THRESHOLD = 0.8;

@Injectable()
export class AgencyLimitEnforcementService {
  evaluateLimits(
    entitlements: AgencyEntitlements,
    usage: AgencyUsageSummary,
    options: AgencyLimitEvaluationOptions = {},
  ): AgencyLimitEnforcementSummary {
    const nearLimitThreshold = this.normalizeNearLimitThreshold(
      options.nearLimitThreshold,
    );
    const isGracePeriodActive = this.isGracePeriodActive(
      options.gracePeriod,
      options.now ?? new Date(),
    );
    const resources = LIMIT_RESOURCES.reduce(
      (acc, resource) => {
        acc[resource] = this.evaluateResource({
          resource,
          usage: usage[resource],
          limit: entitlements.limits[resource],
          nearLimitThreshold,
          isGracePeriodActive,
        });
        return acc;
      },
      {} as Record<AgencyLimitResource, AgencyLimitResourceState>,
    );
    const resourceStates = Object.values(resources);
    const hasLimitedResources = resourceStates.some(
      (resource) => !resource.isUnlimited,
    );
    const hasNearLimitResources = resourceStates.some(
      (resource) => resource.isNearLimit,
    );
    const hasOverLimitResources = resourceStates.some(
      (resource) => resource.isOverLimit,
    );

    return {
      planCode: entitlements.plan.code,
      subscriptionStatus: entitlements.plan.status,
      status: this.resolveWorkspaceStatus({
        hasNearLimitResources,
        hasOverLimitResources,
        isGracePeriodActive,
      }),
      hasLimitedResources,
      hasNearLimitResources,
      hasOverLimitResources,
      isInGracePeriod: hasOverLimitResources && isGracePeriodActive,
      resources,
    };
  }

  private evaluateResource(input: {
    resource: AgencyLimitResource;
    usage: number;
    limit: number | null;
    nearLimitThreshold: number;
    isGracePeriodActive: boolean;
  }): AgencyLimitResourceState {
    if (input.limit === null) {
      return {
        resource: input.resource,
        usage: input.usage,
        limit: null,
        remaining: null,
        usageRatio: null,
        isUnlimited: true,
        isNearLimit: false,
        isOverLimit: false,
        isInGracePeriod: false,
        enforcementAction: 'none',
      };
    }

    const remaining = Math.max(input.limit - input.usage, 0);
    const usageRatio = input.limit > 0 ? input.usage / input.limit : null;
    const isOverLimit = input.usage > input.limit;
    const isAtOrNearLimit =
      usageRatio !== null && usageRatio >= input.nearLimitThreshold;
    const isInGracePeriod = isOverLimit && input.isGracePeriodActive;

    return {
      resource: input.resource,
      usage: input.usage,
      limit: input.limit,
      remaining,
      usageRatio,
      isUnlimited: false,
      isNearLimit: !isOverLimit && isAtOrNearLimit,
      isOverLimit,
      isInGracePeriod,
      enforcementAction: this.resolveResourceAction({
        isNearLimit: !isOverLimit && isAtOrNearLimit,
        isOverLimit,
        isInGracePeriod,
      }),
    };
  }

  private resolveWorkspaceStatus(input: {
    hasNearLimitResources: boolean;
    hasOverLimitResources: boolean;
    isGracePeriodActive: boolean;
  }): AgencyLimitWorkspaceStatus {
    if (input.hasOverLimitResources) {
      return input.isGracePeriodActive
        ? 'over_limit_grace'
        : 'over_limit_enforced';
    }

    if (input.hasNearLimitResources) {
      return 'near_limit';
    }

    return 'within_limit';
  }

  private resolveResourceAction(input: {
    isNearLimit: boolean;
    isOverLimit: boolean;
    isInGracePeriod: boolean;
  }): AgencyLimitEnforcementAction {
    if (input.isOverLimit && input.isInGracePeriod) {
      return 'grace';
    }

    if (input.isOverLimit) {
      return 'block_new_usage';
    }

    if (input.isNearLimit) {
      return 'warn';
    }

    return 'none';
  }

  private isGracePeriodActive(
    gracePeriod: AgencyLimitGracePeriod | null | undefined,
    now: Date,
  ): boolean {
    if (!gracePeriod?.startedAt || !gracePeriod.endsAt) {
      return false;
    }

    const startedAt = new Date(gracePeriod.startedAt).getTime();
    const endsAt = new Date(gracePeriod.endsAt).getTime();
    const currentTime = now.getTime();

    return (
      Number.isFinite(startedAt) &&
      Number.isFinite(endsAt) &&
      startedAt <= currentTime &&
      currentTime < endsAt
    );
  }

  private normalizeNearLimitThreshold(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value)) {
      return DEFAULT_NEAR_LIMIT_THRESHOLD;
    }

    return Math.min(Math.max(value, 0), 1);
  }
}
