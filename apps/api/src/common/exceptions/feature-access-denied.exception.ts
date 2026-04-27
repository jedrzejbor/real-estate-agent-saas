import { ForbiddenException } from '@nestjs/common';

interface FeatureAccessDeniedOptions {
  feature: string;
  planCode: string;
  message: string;
}

export class FeatureAccessDeniedException extends ForbiddenException {
  constructor(options: FeatureAccessDeniedOptions) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      code: 'FEATURE_NOT_AVAILABLE',
      feature: options.feature,
      planCode: options.planCode,
      upgradeRequired: true,
      message: options.message,
    });
  }
}
