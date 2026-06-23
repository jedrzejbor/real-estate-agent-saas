interface AppointmentUrlParams {
  clientId?: string;
  clientLabel?: string;
  listingId?: string;
  listingLabel?: string;
  location?: string | null;
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
