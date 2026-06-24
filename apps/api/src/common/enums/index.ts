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
  CUSTOM = 'custom',
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

export enum ListingCommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum ListingDocumentCategory {
  AGENCY_AGREEMENT = 'agency_agreement',
  LAND_AND_MORTGAGE_REGISTER = 'land_and_mortgage_register',
  OWNERSHIP_DEED = 'ownership_deed',
  NO_ARREARS_CERTIFICATE = 'no_arrears_certificate',
  COMMUNITY_DOCUMENTS = 'community_documents',
  FLOOR_PLAN = 'floor_plan',
  ENERGY_CERTIFICATE = 'energy_certificate',
  HANDOVER_PROTOCOL = 'handover_protocol',
  POWER_OF_ATTORNEY = 'power_of_attorney',
  OTHER = 'other',
}

export enum ListingDocumentStatus {
  MISSING = 'missing',
  REQUESTED = 'requested',
  UPLOADED = 'uploaded',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  NEEDS_CORRECTION = 'needs_correction',
  EXPIRED = 'expired',
}

export enum ListingDocumentEventType {
  UPLOADED = 'uploaded',
  STATUS_CHANGED = 'status_changed',
  METADATA_UPDATED = 'metadata_updated',
  DOWNLOADED = 'downloaded',
  DELETED = 'deleted',
  RESTORED = 'restored',
}

export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent',
}

export enum TransactionStatus {
  LEAD_OFFER = 'lead_offer',
  NEGOTIATION = 'negotiation',
  RESERVED = 'reserved',
  PRELIMINARY_AGREEMENT = 'preliminary_agreement',
  FINANCING = 'financing',
  NOTARY_SCHEDULED = 'notary_scheduled',
  HANDOVER = 'handover',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum TransactionTaskStatus {
  TODO = 'todo',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TransactionTaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export enum TransactionEventType {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  DETAILS_UPDATED = 'details_updated',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed',
  DEADLINE_CHANGED = 'deadline_changed',
  COMMISSION_CHANGED = 'commission_changed',
  CLOSED = 'closed',
  DELETED = 'deleted',
  RESTORED = 'restored',
}

export enum TaskStatus {
  TODO = 'todo',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export enum TaskType {
  FOLLOW_UP = 'follow_up',
  CALL = 'call',
  EMAIL = 'email',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum TaskRelatedEntityType {
  APPOINTMENT = 'appointment',
  CLIENT = 'client',
  LISTING = 'listing',
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
  PUBLIC_PROFILE = 'public_profile',
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

export enum PublicListingSubmissionSource {
  PUBLIC_WIZARD = 'public_wizard',
  EMBED = 'embed',
  PARTNER = 'partner',
  OTHER = 'other',
}

export enum PublicListingSubmissionStatus {
  DRAFT = 'draft',
  PENDING_EMAIL_VERIFICATION = 'pending_email_verification',
  VERIFIED = 'verified',
  PUBLISHED = 'published',
  CLAIMED = 'claimed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
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
  CLAIMED = 'claimed',
  NOTE_ADDED = 'note_added',
  NOTE_REMOVED = 'note_removed',
}
