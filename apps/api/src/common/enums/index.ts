/**
 * Shared enums used across multiple modules.
 * Keep in sync with docs/PROJECT_SPEC.md §1.6
 */

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  AGENT = 'agent',
  VIEWER = 'viewer',
}

export enum AgencyPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  LAND = 'land',
  COMMERCIAL = 'commercial',
  OFFICE = 'office',
  GARAGE = 'garage',
}

export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  RESERVED = 'reserved',
  SOLD = 'sold',
  RENTED = 'rented',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived',
}

export enum ListingPublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum ClientSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  PORTAL = 'portal',
  PHONE = 'phone',
  WALK_IN = 'walk_in',
  SOCIAL_MEDIA = 'social',
  OTHER = 'other',
}

export enum ClientStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  ACTIVE = 'active',
  NEGOTIATING = 'negotiating',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
  INACTIVE = 'inactive',
}

export enum PublicLeadSource {
  PUBLIC_LISTING_PAGE = 'public_listing_page',
  PUBLIC_LISTING_SHARE = 'public_listing_share',
  QR_CODE = 'qr_code',
  EMBED = 'embed',
  OTHER = 'other',
}

export enum PublicLeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED_TO_CLIENT = 'converted_to_client',
  SPAM = 'spam',
  ARCHIVED = 'archived',
}

export enum AppointmentType {
  VIEWING = 'viewing',
  NEGOTIATION = 'negotiation',
  SIGNING = 'signing',
  CONSULTATION = 'consultation',
  OTHER = 'other',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ActivityEntityType {
  LISTING = 'listing',
  CLIENT = 'client',
}

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  STATUS_ROLLED_BACK = 'status_rolled_back',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  NOTE_ADDED = 'note_added',
  NOTE_REMOVED = 'note_removed',
}
