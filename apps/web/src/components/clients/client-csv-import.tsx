'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import {
  CLIENT_SOURCE_LABELS,
  ClientSource,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  createClientSchema,
  importClients,
  type CreateClientFormData,
} from '@/lib/clients';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ClientCsvImportProps {
  onImported: () => void;
}

interface ParsedImport {
  rows: CreateClientFormData[];
  errors: CsvRowError[];
  fileName: string;
}

interface CsvRowError {
  rowNumber: number;
  message: string;
}

const MAX_IMPORT_ROWS = 100;

const HEADER_ALIASES: Record<string, string> = {
  firstname: 'firstName',
  first_name: 'firstName',
  imie: 'firstName',
  name: 'firstName',
  lastname: 'lastName',
  last_name: 'lastName',
  nazwisko: 'lastName',
  surname: 'lastName',
  email: 'email',
  mail: 'email',
  phone: 'phone',
  telefon: 'phone',
  source: 'source',
  zrodlo: 'source',
  budgetmin: 'budgetMin',
  budget_min: 'budgetMin',
  budzetmin: 'budgetMin',
  budzetod: 'budgetMin',
  budgetmax: 'budgetMax',
  budget_max: 'budgetMax',
  budzetmax: 'budgetMax',
  budzetdo: 'budgetMax',
  notes: 'notes',
  notatki: 'notes',
  propertytype: 'preference.propertyType',
  property_type: 'preference.propertyType',
  typnieruchomosci: 'preference.propertyType',
  preferredcity: 'preference.preferredCity',
  preferred_city: 'preference.preferredCity',
  preferowanemiasto: 'preference.preferredCity',
  minarea: 'preference.minArea',
  min_area: 'preference.minArea',
  minpowierzchnia: 'preference.minArea',
  maxprice: 'preference.maxPrice',
  max_price: 'preference.maxPrice',
  cenamax: 'preference.maxPrice',
  minrooms: 'preference.minRooms',
  min_rooms: 'preference.minRooms',
  minpokoje: 'preference.minRooms',
};

const FIELD_LABELS: Record<string, string> = {
  firstName: 'imię',
  lastName: 'nazwisko',
  email: 'email',
  phone: 'telefon',
  source: 'źródło',
  budgetMin: 'budżet od',
  budgetMax: 'budżet do',
  notes: 'notatki',
  'preference.propertyType': 'typ nieruchomości',
  'preference.preferredCity': 'preferowane miasto',
  'preference.minArea': 'minimalna powierzchnia',
  'preference.maxPrice': 'maksymalna cena',
  'preference.minRooms': 'minimalna liczba pokoi',
};

const SOURCE_ALIASES = createEnumAliasMap(CLIENT_SOURCE_LABELS, {
  www: ClientSource.WEBSITE,
  strona: ClientSource.WEBSITE,
  strona_www: ClientSource.WEBSITE,
  polecenie: ClientSource.REFERRAL,
  portal: ClientSource.PORTAL,
  telefon: ClientSource.PHONE,
  wizyta: ClientSource.WALK_IN,
  social: ClientSource.SOCIAL,
  media_spolecznosciowe: ClientSource.SOCIAL,
  inne: ClientSource.OTHER,
});

const PROPERTY_TYPE_ALIASES = createEnumAliasMap(PROPERTY_TYPE_LABELS, {
  mieszkanie: PropertyType.APARTMENT,
  dom: PropertyType.HOUSE,
  dzialka: PropertyType.LAND,
  lokal: PropertyType.COMMERCIAL,
  lokal_uzytkowy: PropertyType.COMMERCIAL,
  biuro: PropertyType.OFFICE,
  garaz: PropertyType.GARAGE,
});

export function ClientCsvImport({ onImported }: ClientCsvImportProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const hasValidRows = (parsed?.rows.length ?? 0) > 0;
  const visibleErrors = useMemo(
    () => parsed?.errors.slice(0, 5) ?? [],
    [parsed],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseClientsCsv(text, file.name);
      setParsed(result);

      if (result.rows.length === 0) {
        toast.warning({
          title: 'Nie znaleziono poprawnych wierszy',
          description: 'Sprawdź wymagane kolumny: imię i nazwisko.',
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nie udało się odczytać pliku CSV';
      setParsed(null);
      toast.error({ title: 'Import CSV przerwany', description: message });
    } finally {
      event.target.value = '';
    }
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importClients(parsed.rows);
      toast.success({
        title: 'Klienci zaimportowani',
        description: `Dodano ${result.imported} ${formatClientsCount(result.imported)} do CRM.`,
      });
      setParsed(null);
      setIsOpen(false);
      onImported();
    } catch (error) {
      toast.error({
        title: 'Nie udało się zaimportować klientów',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="gap-2 rounded-xl"
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
        Import CSV
      </Button>

      {isOpen ? (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-base font-semibold text-foreground">
                  Import klientów z CSV
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Obsługiwane kolumny: imię, nazwisko, email, telefon, źródło,
                  budżet od, budżet do, notatki i podstawowe preferencje.
                  Jednorazowy import przyjmie do {MAX_IMPORT_ROWS} klientów.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Wybierz plik
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {parsed ? (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground">
                  {parsed.fileName}
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <ImportBadge variant="success">
                    {parsed.rows.length} poprawnych
                  </ImportBadge>
                  {parsed.errors.length > 0 ? (
                    <ImportBadge variant="warning">
                      {parsed.errors.length} z błędami
                    </ImportBadge>
                  ) : null}
                </div>
              </div>

              {visibleErrors.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    Wiersze pominięte
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {visibleErrors.map((error) => (
                      <li key={`${error.rowNumber}-${error.message}`}>
                        Wiersz {error.rowNumber}: {error.message}
                      </li>
                    ))}
                  </ul>
                  {parsed.errors.length > visibleErrors.length ? (
                    <p className="mt-2 text-xs text-amber-800">
                      I jeszcze {parsed.errors.length - visibleErrors.length}{' '}
                      poza podglądem.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Zaimportowane zostaną tylko poprawne wiersze.
                </p>
                <Button
                  type="button"
                  className="gap-2 rounded-xl"
                  disabled={!hasValidRows || isImporting}
                  onClick={handleImport}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isImporting ? 'Importowanie...' : 'Importuj klientów'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImportBadge({
  variant,
  children,
}: {
  variant: 'success' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-1',
        variant === 'success'
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      )}
    >
      {children}
    </span>
  );
}

function parseClientsCsv(text: string, fileName: string): ParsedImport {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    throw new Error('Plik musi zawierać nagłówki i co najmniej jeden wiersz.');
  }

  const [headers, ...dataRows] = rows;
  const mappedHeaders = headers.map(resolveHeader);
  const errors: CsvRowError[] = [];
  const validRows: CreateClientFormData[] = [];

  if (
    !mappedHeaders.includes('firstName') ||
    !mappedHeaders.includes('lastName')
  ) {
    throw new Error('CSV musi zawierać kolumny imię i nazwisko.');
  }

  dataRows.slice(0, MAX_IMPORT_ROWS).forEach((row, index) => {
    if (row.every((cell) => cell.trim() === '')) return;

    const candidate = buildClientCandidate(row, mappedHeaders);
    const result = createClientSchema.safeParse(candidate);

    if (result.success) {
      validRows.push(result.data);
      return;
    }

    errors.push({
      rowNumber: index + 2,
      message: result.error.issues
        .map((issue) => {
          const field = issue.path.join('.');
          return `${FIELD_LABELS[field] ?? field}: ${issue.message}`;
        })
        .join('; '),
    });
  });

  if (dataRows.length > MAX_IMPORT_ROWS) {
    errors.push({
      rowNumber: MAX_IMPORT_ROWS + 2,
      message: `Pominięto wiersze powyżej limitu ${MAX_IMPORT_ROWS} rekordów na import.`,
    });
  }

  return {
    rows: validRows,
    errors,
    fileName,
  };
}

function buildClientCandidate(
  row: string[],
  headers: Array<string | null>,
): Record<string, unknown> {
  const candidate: Record<string, unknown> = {};
  const preference: Record<string, unknown> = {};

  headers.forEach((field, index) => {
    if (!field) return;
    const rawValue = row[index]?.trim() ?? '';
    if (!rawValue) return;

    const value = normalizeFieldValue(field, rawValue);
    if (value === '') return;

    if (field.startsWith('preference.')) {
      preference[field.replace('preference.', '')] = value;
      return;
    }

    candidate[field] = value;
  });

  if (Object.keys(preference).length > 0) {
    candidate.preference = preference;
  }

  return candidate;
}

function normalizeFieldValue(field: string, value: string): string | number {
  if (field === 'source') {
    return SOURCE_ALIASES[normalizeToken(value)] ?? value;
  }

  if (field === 'preference.propertyType') {
    return PROPERTY_TYPE_ALIASES[normalizeToken(value)] ?? value;
  }

  if (
    field === 'budgetMin' ||
    field === 'budgetMax' ||
    field === 'preference.minArea' ||
    field === 'preference.maxPrice' ||
    field === 'preference.minRooms'
  ) {
    return parseNumberCell(value);
  }

  return value;
}

function parseCsvRows(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index++;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

function resolveHeader(header: string): string | null {
  return HEADER_ALIASES[normalizeToken(header)] ?? null;
}

function parseNumberCell(value: string): number | string {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/zł|pln/gi, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

function createEnumAliasMap<T extends string>(
  labels: Record<T, string>,
  aliases: Record<string, T>,
): Record<string, T> {
  const result: Record<string, T> = { ...aliases };

  for (const [value, label] of Object.entries(labels) as Array<[T, string]>) {
    result[normalizeToken(value)] = value;
    result[normalizeToken(label)] = value;
  }

  return result;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatClientsCount(count: number): string {
  if (count === 1) return 'klienta';
  if (count > 1 && count < 5) return 'klientów';
  return 'klientów';
}
