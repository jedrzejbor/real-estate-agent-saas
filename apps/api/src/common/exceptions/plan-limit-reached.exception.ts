import { ForbiddenException } from '@nestjs/common';

interface PlanLimitReachedOptions {
  resource: 'listings' | 'clients' | 'appointments' | 'images' | 'users';
  limit: number;
  currentUsage: number;
  attemptedUsage?: number;
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
      usage: options.currentUsage,
      currentUsage: options.currentUsage,
      attemptedUsage: options.attemptedUsage ?? options.currentUsage + 1,
      planCode: options.planCode,
      upgradeRequired: true,
      message: options.message,
    });
  }
}
