import { Injectable } from '@nestjs/common';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { Agency } from './entities';

export interface AgencyPlanLimits {
  activeListings: number | null;
  clients: number | null;
  monthlyAppointments: number | null;
  users: number | null;
  imagesPerListing: number | null;
}

export interface AgencyPlanFeatures {
  reportsOverview: boolean;
  reportsListingsBasic: boolean;
  reportsClientsBasic: boolean;
  reportsAppointmentsBasic: boolean;
  publicListings: boolean;
  publicLeadForms: boolean;
  customBranding: boolean;
  multiUser: boolean;
}

export interface AgencyEntitlements {
  plan: {
    code: AgencyPlan;
    label: string;
    status: SubscriptionStatus;
  };
  limits: AgencyPlanLimits;
  features: AgencyPlanFeatures;
}

@Injectable()
export class AgencyPlanService {
  getEntitlements(agency?: Agency | null): AgencyEntitlements {
    const plan = this.getPlanCode(agency?.plan);
    const status = this.getSubscriptionStatus(agency?.subscription);

    return {
      plan: {
        code: plan,
        label: this.getPlanLabel(plan),
        status,
      },
      limits: this.getLimits(plan),
      features: this.getFeatures(plan),
    };
  }

  private getPlanCode(value?: string | null): AgencyPlan {
    switch (value) {
      case AgencyPlan.STARTER:
      case AgencyPlan.PROFESSIONAL:
      case AgencyPlan.ENTERPRISE:
        return value;
      case AgencyPlan.FREE:
      default:
        return AgencyPlan.FREE;
    }
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

  private getPlanLabel(plan: AgencyPlan): string {
    switch (plan) {
      case AgencyPlan.STARTER:
        return 'Starter';
      case AgencyPlan.PROFESSIONAL:
        return 'Professional';
      case AgencyPlan.ENTERPRISE:
        return 'Enterprise';
      case AgencyPlan.FREE:
      default:
        return 'Free';
    }
  }

  private getLimits(plan: AgencyPlan): AgencyPlanLimits {
    switch (plan) {
      case AgencyPlan.STARTER:
        return {
          activeListings: 25,
          clients: 250,
          monthlyAppointments: 150,
          users: 1,
          imagesPerListing: 30,
        };
      case AgencyPlan.PROFESSIONAL:
        return {
          activeListings: 200,
          clients: 2_500,
          monthlyAppointments: 1_000,
          users: 5,
          imagesPerListing: 50,
        };
      case AgencyPlan.ENTERPRISE:
        return {
          activeListings: null,
          clients: null,
          monthlyAppointments: null,
          users: null,
          imagesPerListing: null,
        };
      case AgencyPlan.FREE:
      default:
        return {
          activeListings: 5,
          clients: 25,
          monthlyAppointments: 20,
          users: 1,
          imagesPerListing: 15,
        };
    }
  }

  private getFeatures(plan: AgencyPlan): AgencyPlanFeatures {
    switch (plan) {
      case AgencyPlan.STARTER:
        return {
          reportsOverview: true,
          reportsListingsBasic: true,
          reportsClientsBasic: true,
          reportsAppointmentsBasic: true,
          publicListings: true,
          publicLeadForms: true,
          customBranding: false,
          multiUser: false,
        };
      case AgencyPlan.PROFESSIONAL:
      case AgencyPlan.ENTERPRISE:
        return {
          reportsOverview: true,
          reportsListingsBasic: true,
          reportsClientsBasic: true,
          reportsAppointmentsBasic: true,
          publicListings: true,
          publicLeadForms: true,
          customBranding: true,
          multiUser: true,
        };
      case AgencyPlan.FREE:
      default:
        return {
          reportsOverview: true,
          reportsListingsBasic: true,
          reportsClientsBasic: true,
          reportsAppointmentsBasic: false,
          publicListings: true,
          publicLeadForms: true,
          customBranding: false,
          multiUser: false,
        };
    }
  }
}