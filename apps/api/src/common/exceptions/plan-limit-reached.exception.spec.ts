import { PlanLimitReachedException } from './plan-limit-reached.exception';

describe('PlanLimitReachedException', () => {
  it('returns a stable upgrade payload with usage and attempted usage', () => {
    const exception = new PlanLimitReachedException({
      resource: 'clients',
      limit: 25,
      currentUsage: 24,
      attemptedUsage: 28,
      planCode: 'free',
      message: 'Limit klientów został przekroczony',
    });

    expect(exception.getResponse()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'PLAN_LIMIT_REACHED',
      limitCode: 'CLIENT_LIMIT_EXCEEDED',
      resource: 'clients',
      limit: 25,
      usage: 24,
      currentUsage: 24,
      attemptedUsage: 28,
      planCode: 'free',
      upgradeRequired: true,
      message: 'Limit klientów został przekroczony',
    });
  });

  it('defaults attempted usage to current usage plus one', () => {
    const exception = new PlanLimitReachedException({
      resource: 'users',
      limit: 1,
      currentUsage: 1,
      planCode: 'starter',
      message: 'Limit użytkowników został przekroczony',
    });

    expect(exception.getResponse()).toMatchObject({
      limitCode: 'USER_LIMIT_EXCEEDED',
      resource: 'users',
      usage: 1,
      currentUsage: 1,
      attemptedUsage: 2,
    });
  });
});
