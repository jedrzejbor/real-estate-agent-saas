import { ForbiddenException } from '@nestjs/common';

interface PlanLimitReachedOptions {
  resource: 'listings' | 'clients' | 'appointments' | 'images' | 'users';
  limit: number;
  currentUsage: number;
  attemptedUsage?: number;
  planCode: string;
  message: string;
}

const LIMIT_CODE_BY_RESOURCE: Record<
  PlanLimitReachedOptions['resource'],
  string
> = {
  listings: 'LISTING_LIMIT_EXCEEDED',
  clients: 'CLIENT_LIMIT_EXCEEDED',
  appointments: 'APPOINTMENT_LIMIT_EXCEEDED',
  images: 'IMAGE_LIMIT_EXCEEDED',
  users: 'USER_LIMIT_EXCEEDED',
};

export class PlanLimitReachedException extends ForbiddenException {
  constructor(options: PlanLimitReachedOptions) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      code: 'PLAN_LIMIT_REACHED',
      limitCode: LIMIT_CODE_BY_RESOURCE[options.resource],
      resource: options.resource,
      limit: options.limit,
      usage: options.currentUsage,
      currentUsage: options.currentUsage,
      attemptedUsage: options.attemptedUsage ?? options.currentUsage + 1,
      planCode: options.planCode,
      upgradeRequired: true,
      message: options.message,
    });
  }
}
