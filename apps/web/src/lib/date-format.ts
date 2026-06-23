export function formatDisplayDateNumeric(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDisplayTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDisplayTimeRange(
  start: string | Date,
  end: string | Date,
): string {
  return `${formatDisplayTime(start)} - ${formatDisplayTime(end)}`;
}
