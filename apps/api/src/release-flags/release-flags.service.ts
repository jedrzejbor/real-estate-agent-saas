import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ReleaseFlags {
  publicListingsEnabled: boolean;
  publicLeadFormsEnabled: boolean;
  publicClaimFlowEnabled: boolean;
  freemiumUpsellEnabled: boolean;
  premiumReportsEnabled: boolean;
}

@Injectable()
export class ReleaseFlagsService {
  constructor(private readonly configService: ConfigService) {}

  getFlags(): ReleaseFlags {
    return {
      publicListingsEnabled: this.getBooleanFlag(
        'RELEASE_FLAG_PUBLIC_LISTINGS_ENABLED',
        false,
      ),
      publicLeadFormsEnabled: this.getBooleanFlag(
        'RELEASE_FLAG_PUBLIC_LEAD_FORMS_ENABLED',
        false,
      ),
      publicClaimFlowEnabled: this.getBooleanFlag(
        'RELEASE_FLAG_PUBLIC_CLAIM_FLOW_ENABLED',
        false,
      ),
      freemiumUpsellEnabled: this.getBooleanFlag(
        'RELEASE_FLAG_FREEMIUM_UPSELL_ENABLED',
        true,
      ),
      premiumReportsEnabled: this.getBooleanFlag(
        'RELEASE_FLAG_PREMIUM_REPORTS_ENABLED',
        true,
      ),
    };
  }

  private getBooleanFlag(key: string, fallback: boolean): boolean {
    const value = this.configService.get<string | boolean | undefined>(key);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return fallback;
    }

    switch (value.trim().toLowerCase()) {
      case '1':
      case 'true':
      case 'yes':
      case 'on':
        return true;
      case '0':
      case 'false':
      case 'no':
      case 'off':
        return false;
      default:
        return fallback;
    }
  }
}
