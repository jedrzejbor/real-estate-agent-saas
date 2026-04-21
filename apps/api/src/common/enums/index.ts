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
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  NOTE_ADDED = 'note_added',
  NOTE_REMOVED = 'note_removed',
}
