import {
  PROPERTY_TYPE_LABELS,
  PropertyType,
  TransactionType,
} from './listings';

export interface ListingDescriptionAssistantInput {
  title?: string;
  propertyType?: PropertyType | '';
  transactionType?: TransactionType | '';
  price?: number | null;
  currency?: string;
  city?: string;
  district?: string;
  street?: string;
  areaM2?: number | null;
  plotAreaM2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  yearBuilt?: number | null;
  description?: string;
}

export interface ListingQualityHint {
  id: string;
  severity: 'info' | 'warning';
  title: string;
  description: string;
}

export interface ListingQualityReport {
  score: number;
  label: string;
  hints: ListingQualityHint[];
}

export interface DescriptionAssistantUsage {
  used: number;
  remaining: number;
  key: string;
}

export const DESCRIPTION_ASSISTANT_MONTHLY_LIMIT = 12;

const LONG_DESCRIPTION_LENGTH = 900;
const MIN_DESCRIPTION_LENGTH = 280;
const DESCRIPTION_ASSISTANT_STORAGE_PREFIX =
  'estateflow:listing-description-assistant';

export function buildListingDescription(
  input: ListingDescriptionAssistantInput,
): string {
  const propertyLabel = getPropertyLabel(input.propertyType);
  const transactionLabel = getTransactionPhrase(input.transactionType);
  const location = formatLocation(input);
  const size = formatSize(input);
  const rooms = formatRooms(input.rooms);
  const bathrooms = formatBathrooms(input.bathrooms);
  const floor = formatFloor(input);
  const yearBuilt = input.yearBuilt
    ? `Budynek powstał w ${input.yearBuilt} roku.`
    : '';
  const price = input.price
    ? `Cena: ${formatPrice(input.price, input.currency)}.`
    : '';

  const opening = [
    transactionLabel,
    propertyLabel.toLowerCase(),
    location ? `w lokalizacji ${location}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const details = [size, rooms, bathrooms, floor, yearBuilt, price].filter(
    Boolean,
  );

  const lifestyle = buildLifestyleSentence(input.propertyType);
  const callToAction =
    'Zapraszam do kontaktu, aby poznać szczegóły i umówić prezentację nieruchomości.';

  return [
    sentenceCase(opening || `Przedstawiamy ${propertyLabel.toLowerCase()}.`),
    details.join(' '),
    lifestyle,
    callToAction,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function evaluateListingQuality(
  input: ListingDescriptionAssistantInput,
): ListingQualityReport {
  const hints: ListingQualityHint[] = [];
  const descriptionLength = input.description?.trim().length ?? 0;

  if (!input.title || input.title.trim().length < 18) {
    hints.push({
      id: 'short-title',
      severity: 'warning',
      title: 'Doprecyzuj tytuł',
      description:
        'Dodaj wyróżnik: lokalizację, metraż, widok, ogród albo standard wykończenia.',
    });
  }

  if (descriptionLength === 0) {
    hints.push({
      id: 'missing-description',
      severity: 'warning',
      title: 'Brakuje opisu',
      description:
        'Opis zwiększa szansę na kontakt i jest wymagany do sensownej publicznej prezentacji.',
    });
  } else if (descriptionLength < MIN_DESCRIPTION_LENGTH) {
    hints.push({
      id: 'short-description',
      severity: 'warning',
      title: 'Opis jest krótki',
      description:
        'Dopisz układ pomieszczeń, atuty lokalizacji, standard i informację dla kogo oferta będzie dobra.',
    });
  } else if (descriptionLength > LONG_DESCRIPTION_LENGTH) {
    hints.push({
      id: 'long-description',
      severity: 'info',
      title: 'Opis jest długi',
      description:
        'Rozważ krótsze akapity i najważniejsze informacje na początku opisu.',
    });
  }

  if (requiresArea(input.propertyType) && !input.areaM2) {
    hints.push({
      id: 'missing-area',
      severity: 'warning',
      title: 'Brakuje powierzchni',
      description:
        'Metraż jest jednym z pierwszych parametrów porównywanych przez klientów.',
    });
  }

  if (requiresPlotArea(input.propertyType) && !input.plotAreaM2) {
    hints.push({
      id: 'missing-plot-area',
      severity: 'warning',
      title: 'Brakuje powierzchni działki',
      description:
        'Przy domach i działkach powierzchnia gruntu mocno wpływa na jakość ogłoszenia.',
    });
  }

  if (requiresRooms(input.propertyType) && !input.rooms) {
    hints.push({
      id: 'missing-rooms',
      severity: 'info',
      title: 'Dodaj liczbę pokoi',
      description:
        'Liczba pokoi pomaga klientom szybko ocenić, czy oferta pasuje do ich potrzeb.',
    });
  }

  if (!input.district && input.city) {
    hints.push({
      id: 'missing-district',
      severity: 'info',
      title: 'Dodaj dzielnicę',
      description:
        'Dzielnica poprawia czytelność publicznej strony, nawet jeśli dokładny adres pozostaje ukryty.',
    });
  }

  if (requiresYearBuilt(input.propertyType) && !input.yearBuilt) {
    hints.push({
      id: 'missing-year-built',
      severity: 'info',
      title: 'Rozważ rok budowy',
      description:
        'Rok budowy pomaga klientom odczytać standard budynku i kontekst ceny.',
    });
  }

  const warningPenalty = hints.filter(
    (hint) => hint.severity === 'warning',
  ).length;
  const infoPenalty = hints.filter((hint) => hint.severity === 'info').length;
  const score = Math.max(0, 100 - warningPenalty * 18 - infoPenalty * 8);

  return {
    score,
    label:
      score >= 85 ? 'Bardzo dobra' : score >= 65 ? 'Do dopracowania' : 'Słaba',
    hints,
  };
}

export function getStoredDescriptionAssistantUsage(): DescriptionAssistantUsage {
  const key = getDescriptionAssistantStorageKey();
  if (typeof window === 'undefined') {
    return buildUsage(key, 0);
  }

  const used = Number(window.localStorage.getItem(key) ?? 0);
  return buildUsage(key, used);
}

export function incrementStoredDescriptionAssistantUsage(): DescriptionAssistantUsage {
  const current = getStoredDescriptionAssistantUsage();
  const used = Math.min(current.used + 1, DESCRIPTION_ASSISTANT_MONTHLY_LIMIT);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(current.key, String(used));
  }

  return buildUsage(current.key, used);
}

function getPropertyLabel(propertyType: PropertyType | '' | undefined): string {
  return propertyType ? PROPERTY_TYPE_LABELS[propertyType] : 'Nieruchomość';
}

function getTransactionPhrase(
  transactionType: TransactionType | '' | undefined,
): string {
  if (!transactionType) return 'Przedstawiamy';
  return transactionType === 'sale' ? 'Na sprzedaż' : 'Do wynajęcia';
}

function formatLocation(input: ListingDescriptionAssistantInput): string {
  return [input.street, input.district, input.city].filter(Boolean).join(', ');
}

function formatSize(input: ListingDescriptionAssistantInput): string {
  const parts = [
    input.areaM2
      ? `powierzchnia użytkowa ${formatNumber(input.areaM2)} m²`
      : '',
    input.plotAreaM2 ? `działka ${formatNumber(input.plotAreaM2)} m²` : '',
  ].filter(Boolean);

  return parts.length ? `Nieruchomość ma ${parts.join(' oraz ')}.` : '';
}

function formatRooms(rooms: number | null | undefined): string {
  if (!rooms) return '';
  return `Układ obejmuje ${rooms} ${pluralize(rooms, ['pokój', 'pokoje', 'pokoi'])}.`;
}

function formatBathrooms(bathrooms: number | null | undefined): string {
  if (bathrooms === null || bathrooms === undefined) return '';
  return `Do dyspozycji jest ${bathrooms} ${pluralize(bathrooms, ['łazienka', 'łazienki', 'łazienek'])}.`;
}

function formatFloor(input: ListingDescriptionAssistantInput): string {
  if (input.floor === null || input.floor === undefined) return '';
  if (input.totalFloors) {
    return `Lokal znajduje się na ${input.floor}. piętrze w budynku z ${input.totalFloors} piętrami.`;
  }
  return `Lokal znajduje się na ${input.floor}. piętrze.`;
}

function buildLifestyleSentence(
  propertyType: PropertyType | '' | undefined,
): string {
  switch (propertyType) {
    case 'house':
      return 'To propozycja dla osób, które szukają większej przestrzeni, prywatności i wygodnego miejsca do życia.';
    case 'land':
      return 'Oferta sprawdzi się dla osób planujących własną inwestycję lub budowę w dobrze opisanej lokalizacji.';
    case 'commercial':
    case 'office':
      return 'To propozycja dla przedsiębiorców szukających funkcjonalnej przestrzeni w czytelnej lokalizacji.';
    case 'garage':
      return 'To praktyczna oferta dla osób potrzebujących bezpiecznego miejsca postojowego lub dodatkowej przestrzeni.';
    case 'apartment':
    default:
      return 'Oferta sprawdzi się dla osób szukających wygodnej przestrzeni do życia lub inwestycji.';
  }
}

function formatPrice(price: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 2,
  }).format(value);
}

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
}

function pluralize(
  count: number,
  [one, few, many]: [string, string, string],
): string {
  if (count === 1) return one;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

function requiresArea(propertyType: PropertyType | '' | undefined): boolean {
  return Boolean(
    propertyType &&
    ['apartment', 'house', 'commercial', 'office', 'garage'].includes(
      propertyType,
    ),
  );
}

function requiresPlotArea(
  propertyType: PropertyType | '' | undefined,
): boolean {
  return propertyType === 'house' || propertyType === 'land';
}

function requiresRooms(propertyType: PropertyType | '' | undefined): boolean {
  return Boolean(
    propertyType &&
    ['apartment', 'house', 'commercial', 'office'].includes(propertyType),
  );
}

function requiresYearBuilt(
  propertyType: PropertyType | '' | undefined,
): boolean {
  return Boolean(
    propertyType &&
    ['apartment', 'house', 'commercial', 'office'].includes(propertyType),
  );
}

function getDescriptionAssistantStorageKey(): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${DESCRIPTION_ASSISTANT_STORAGE_PREFIX}:${month}`;
}

function buildUsage(key: string, used: number): DescriptionAssistantUsage {
  const normalizedUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
  return {
    key,
    used: normalizedUsed,
    remaining: Math.max(
      DESCRIPTION_ASSISTANT_MONTHLY_LIMIT - normalizedUsed,
      0,
    ),
  };
}
