import { apiFetch } from './api-client';
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS as CLIENT_PROPERTY_TYPE_LABELS,
} from './clients';
import {
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS as LISTING_PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from './listings';

export type ActivityEntityType = 'listing' | 'client';
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'status_rolled_back'
  | 'deleted'
  | 'archived'
  | 'note_added'
  | 'note_removed';

export interface ActivityChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ActivityHistoryItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  description: string | null;
  changes: ActivityChange[];
  createdAt: string;
  actor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  created: 'Utworzono',
  updated: 'Zaktualizowano',
  status_changed: 'Zmieniono status',
  status_rolled_back: 'Cofnięto status',
  deleted: 'Usunięto',
  archived: 'Zarchiwizowano',
  note_added: 'Dodano notatkę',
  note_removed: 'Usunięto notatkę',
};

export const LISTING_HISTORY_FIELD_LABELS: Record<string, string> = {
  title: 'Tytuł',
  description: 'Opis',
  propertyType: 'Typ nieruchomości',
  status: 'Status',
  transactionType: 'Typ transakcji',
  price: 'Cena',
  currency: 'Waluta',
  areaM2: 'Powierzchnia',
  plotAreaM2: 'Powierzchnia działki',
  rooms: 'Pokoje',
  bathrooms: 'Łazienki',
  floor: 'Piętro',
  totalFloors: 'Wszystkie piętra',
  yearBuilt: 'Rok budowy',
  isPremium: 'Premium',
  publishedAt: 'Data publikacji',
  'address.street': 'Ulica',
  'address.city': 'Miasto',
  'address.postalCode': 'Kod pocztowy',
  'address.district': 'Dzielnica',
  'address.voivodeship': 'Województwo',
  'address.lat': 'Szerokość geograficzna',
  'address.lng': 'Długość geograficzna',
};

export const CLIENT_HISTORY_FIELD_LABELS: Record<string, string> = {
  firstName: 'Imię',
  lastName: 'Nazwisko',
  email: 'Email',
  phone: 'Telefon',
  source: 'Źródło',
  status: 'Status',
  budgetMin: 'Budżet min.',
  budgetMax: 'Budżet max.',
  notes: 'Notatki',
  'preference.propertyType': 'Preferowany typ',
  'preference.minArea': 'Min. powierzchnia',
  'preference.maxPrice': 'Max. cena',
  'preference.preferredCity': 'Preferowane miasto',
  'preference.minRooms': 'Min. pokoje',
};

export async function fetchListingHistory(
  id: string,
): Promise<ActivityHistoryItem[]> {
  return apiFetch<ActivityHistoryItem[]>(`/listings/${id}/history`);
}

export async function fetchClientHistory(
  id: string,
): Promise<ActivityHistoryItem[]> {
  return apiFetch<ActivityHistoryItem[]>(`/clients/${id}/history`);
}

export function getRollbackStatusChange(
  items: ActivityHistoryItem[],
  currentStatus: string,
): ActivityChange | null {
  const latestStatusChange = items.find(
    (item) => item.action === 'status_changed',
  );

  if (!latestStatusChange) {
    return null;
  }

  const change = latestStatusChange.changes.find(
    (entry) =>
      entry.field === 'status' &&
      typeof entry.oldValue === 'string' &&
      typeof entry.newValue === 'string',
  );

  if (!change || change.newValue !== currentStatus) {
    return null;
  }

  return change;
}

export function formatActivityActor(item: ActivityHistoryItem): string {
  const fullName = [item.actor.firstName, item.actor.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || item.actor.email || 'Nieznany użytkownik';
}

export function formatActivityValue(
  field: string,
  value: unknown,
  entityType: ActivityEntityType,
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field === 'status' && typeof value === 'string') {
    return entityType === 'listing'
      ? LISTING_STATUS_LABELS[value as keyof typeof LISTING_STATUS_LABELS] ?? value
      : CLIENT_STATUS_LABELS[value as keyof typeof CLIENT_STATUS_LABELS] ?? value;
  }

  if (field === 'propertyType' && typeof value === 'string') {
    return LISTING_PROPERTY_TYPE_LABELS[
      value as keyof typeof LISTING_PROPERTY_TYPE_LABELS
    ] ?? value;
  }

  if (field === 'transactionType' && typeof value === 'string') {
    return TRANSACTION_TYPE_LABELS[
      value as keyof typeof TRANSACTION_TYPE_LABELS
    ] ?? value;
  }

  if (field === 'source' && typeof value === 'string') {
    return CLIENT_SOURCE_LABELS[value as keyof typeof CLIENT_SOURCE_LABELS] ?? value;
  }

  if (field === 'preference.propertyType' && typeof value === 'string') {
    return CLIENT_PROPERTY_TYPE_LABELS[
      value as keyof typeof CLIENT_PROPERTY_TYPE_LABELS
    ] ?? value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Tak' : 'Nie';
  }

  if (typeof value === 'string' && /At$/.test(field)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pl-PL');
    }
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('pl-PL').format(value);
  }

  return String(value);
}
