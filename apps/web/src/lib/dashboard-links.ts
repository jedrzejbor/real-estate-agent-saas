interface AppointmentUrlParams {
  clientId?: string;
  clientLabel?: string;
  listingId?: string;
  listingLabel?: string;
  location?: string | null;
}

interface NewClientUrlParams {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function buildNewAppointmentUrl(params: AppointmentUrlParams): string {
  const query = new URLSearchParams();

  if (params.clientId) query.set('clientId', params.clientId);
  if (params.clientLabel) query.set('clientLabel', params.clientLabel);
  if (params.listingId) query.set('listingId', params.listingId);
  if (params.listingLabel) query.set('listingLabel', params.listingLabel);
  if (params.location) query.set('location', params.location);

  const search = query.toString();
  return search
    ? `/dashboard/calendar/new?${search}`
    : '/dashboard/calendar/new';
}

export function buildNewClientUrl(params: NewClientUrlParams): string {
  const query = new URLSearchParams();
  const name = splitDisplayName(params.fullName);
  const firstName = params.firstName?.trim() || name.firstName;
  const lastName = params.lastName?.trim() || name.lastName;

  if (firstName) query.set('firstName', firstName);
  if (lastName) query.set('lastName', lastName);
  if (params.email?.trim()) query.set('email', params.email.trim());
  if (params.phone?.trim()) query.set('phone', params.phone.trim());
  if (params.notes?.trim()) query.set('notes', params.notes.trim());

  const search = query.toString();
  return search ? `/dashboard/clients/new?${search}` : '/dashboard/clients/new';
}

function splitDisplayName(value?: string | null): {
  firstName?: string;
  lastName?: string;
} {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
