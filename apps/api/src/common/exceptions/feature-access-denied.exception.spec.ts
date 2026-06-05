import { FeatureAccessDeniedException } from './feature-access-denied.exception';

describe('FeatureAccessDeniedException', () => {
  it('returns a stable upgrade payload with required feature', () => {
    const exception = new FeatureAccessDeniedException({
      feature: 'publicListings',
      planCode: 'free',
      message: 'Publiczne oferty nie są dostępne w planie',
    });

    expect(exception.getResponse()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'FEATURE_NOT_AVAILABLE',
      feature: 'publicListings',
      requiredFeature: 'publicListings',
      planCode: 'free',
      upgradeRequired: true,
      message: 'Publiczne oferty nie są dostępne w planie',
    });
  });
});
