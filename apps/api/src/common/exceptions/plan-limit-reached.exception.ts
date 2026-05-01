import { ForbiddenException } from '@nestjs/common';

interface PlanLimitReachedOptions {
  resource: 'listings' | 'clients' | 'appointments' | 'images';
  limit: number;
  currentUsage: number;
  planCode: string;
  message: string;
}

export class PlanLimitReachedException extends ForbiddenException {
  constructor(options: PlanLimitReachedOptions) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      code: 'PLAN_LIMIT_REACHED',
      resource: options.resource,
      limit: options.limit,
      currentUsage: options.currentUsage,
      planCode: options.planCode,
      upgradeRequired: true,
      message: options.message,
    });
  }
}
