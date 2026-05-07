import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { createInterface } from 'readline';
import { Repository } from 'typeorm';
import { Location } from './entities';
import { normalizeLocationSearch } from './locations-normalization';

interface ImportLocationRow {
  name: string;
  municipality?: string | null;
  county?: string | null;
  voivodeship: string;
  simcCode?: string | null;
  lat: number;
  lng: number;
  priority?: number | null;
  source?: string | null;
}

export interface ImportLocationsOptions {
  filePath: string;
  delimiter?: string;
  source?: string;
  deactivateMissing?: boolean;
  batchSize?: number;
}

export interface ImportLocationsResult {
  processed: number;
  imported: number;
  skipped: number;
  deactivated: number;
}

@Injectable()
export class LocationsImportService {
  private readonly logger = new Logger(LocationsImportService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async importFromFile(
    options: ImportLocationsOptions,
  ): Promise<ImportLocationsResult> {
    const batchSize = options.batchSize ?? 500;
    const source = options.source ?? 'import';
    const seenKeys = new Set<string>();
    const result: ImportLocationsResult = {
      processed: 0,
      imported: 0,
      skipped: 0,
      deactivated: 0,
    };

    let batch: ImportLocationRow[] = [];

    for await (const row of readLocationRows(options)) {
      result.processed += 1;

      if (!isValidLocationRow(row)) {
        result.skipped += 1;
        continue;
      }

      batch.push({
        ...row,
        source: row.source ?? source,
      });

      if (row.simcCode) {
        seenKeys.add(`simc:${row.simcCode}`);
      } else {
        seenKeys.add(`natural:${buildNaturalKey(row)}`);
      }

      if (batch.length >= batchSize) {
        result.imported += await this.upsertBatch(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      result.imported += await this.upsertBatch(batch);
    }

    if (options.deactivateMissing) {
      result.deactivated = await this.deactivateMissing(source, seenKeys);
    }

    this.logger.log(
      `Locations import completed: processed=${result.processed}, imported=${result.imported}, skipped=${result.skipped}, deactivated=${result.deactivated}`,
    );

    return result;
  }

  private async upsertBatch(rows: ImportLocationRow[]): Promise<number> {
    const entities = rows.map((row) =>
      this.locationRepo.create({
        name: row.name.trim(),
        normalizedName: normalizeLocationSearch(row.name) ?? row.name.trim(),
        naturalKey: buildNaturalKey(row),
        searchText: buildSearchText(row),
        municipality: row.municipality?.trim() || null,
        county: row.county?.trim() || null,
        voivodeship: row.voivodeship.trim(),
        simcCode: row.simcCode?.trim() || null,
        lat: row.lat,
        lng: row.lng,
        priority: row.priority ?? 50,
        source: row.source ?? 'import',
        active: true,
      }),
    );

    const withSimc = entities.filter((entity) => entity.simcCode);
    const withoutSimc = entities.filter((entity) => !entity.simcCode);

    if (withSimc.length > 0) {
      await this.locationRepo.upsert(withSimc, ['simcCode']);
    }

    for (const entity of withoutSimc) {
      await this.locationRepo.upsert(entity, ['naturalKey']);
    }

    return entities.length;
  }

  private async deactivateMissing(
    source: string,
    seenKeys: Set<string>,
  ): Promise<number> {
    const existing = await this.locationRepo.find({
      where: { source, active: true },
      select: [
        'id',
        'normalizedName',
        'naturalKey',
        'voivodeship',
        'county',
        'municipality',
        'simcCode',
      ],
    });
    const idsToDeactivate = existing
      .filter((location) => {
        const key = location.simcCode
          ? `simc:${location.simcCode}`
          : `natural:${location.naturalKey}`;
        return !seenKeys.has(key);
      })
      .map((location) => location.id);

    if (idsToDeactivate.length === 0) {
      return 0;
    }

    await this.locationRepo.update(idsToDeactivate, { active: false });
    return idsToDeactivate.length;
  }
}

async function* readLocationRows(
  options: ImportLocationsOptions,
): AsyncGenerator<ImportLocationRow> {
  const extension = extname(options.filePath).toLowerCase();

  if (extension === '.json') {
    const raw = await readFile(options.filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('JSON import file must contain an array of locations.');
    }

    for (const item of parsed) {
      yield mapRecordToLocationRow(asRecord(item));
    }
    return;
  }

  if (extension === '.jsonl') {
    const lines = createInterface({
      input: createReadStream(options.filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line.trim()) continue;
      yield mapRecordToLocationRow(asRecord(JSON.parse(line)));
    }
    return;
  }

  yield* readDelimitedLocationRows(options);
}

async function* readDelimitedLocationRows(
  options: ImportLocationsOptions,
): AsyncGenerator<ImportLocationRow> {
  const delimiter = options.delimiter ?? ';';
  const lines = createInterface({
    input: createReadStream(options.filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let headers: string[] | null = null;

  for await (const line of lines) {
    if (!line.trim()) continue;

    const values = parseDelimitedLine(line, delimiter);

    if (!headers) {
      headers = values.map(normalizeHeader);
      continue;
    }

    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });

    yield mapRecordToLocationRow(record);
  }
}

function mapRecordToLocationRow(
  record: Record<string, unknown>,
): ImportLocationRow {
  return {
    name: getRequiredString(record, [
      'name',
      'nazwa',
      'miejscowosc',
      'nazwa_miejscowosci',
    ]),
    municipality: getOptionalString(record, ['municipality', 'gmina']),
    county: getOptionalString(record, ['county', 'powiat']),
    voivodeship: getRequiredString(record, ['voivodeship', 'wojewodztwo']),
    simcCode: getOptionalString(record, ['simc_code', 'simc', 'sym']),
    lat: getRequiredNumber(record, ['lat', 'latitude', 'szerokosc']),
    lng: getRequiredNumber(record, ['lng', 'lon', 'longitude', 'dlugosc']),
    priority: getOptionalNumber(record, ['priority', 'priorytet']),
    source: getOptionalString(record, ['source', 'zrodlo']),
  };
}

function isValidLocationRow(row: ImportLocationRow): boolean {
  return (
    Boolean(row.name.trim()) &&
    Boolean(row.voivodeship.trim()) &&
    Number.isFinite(row.lat) &&
    row.lat >= -90 &&
    row.lat <= 90 &&
    Number.isFinite(row.lng) &&
    row.lng >= -180 &&
    row.lng <= 180
  );
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return (
    normalizeLocationSearch(value.replace(/^\uFEFF/, ''))
      ?.replace(/\s+/g, '_')
      .replace(/^woj$/, 'wojewodztwo') ?? value.trim()
  );
}

function getRequiredString(
  record: Record<string, unknown>,
  keys: string[],
): string {
  const value = getOptionalString(record, keys);
  if (!value) {
    throw new Error(
      `Location import row is missing required field: ${keys[0]}`,
    );
  }
  return value;
}

function getOptionalString(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function getRequiredNumber(
  record: Record<string, unknown>,
  keys: string[],
): number {
  const value = getOptionalNumber(record, keys);
  if (value === null) {
    throw new Error(
      `Location import row is missing required number: ${keys[0]}`,
    );
  }
  return value;
}

function getOptionalNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(',', '.'));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Location import entry must be an object.');
  }
  return value as Record<string, unknown>;
}

function buildNaturalKey(row: {
  normalizedName?: string;
  name?: string;
  voivodeship?: string | null;
  county?: string | null;
  municipality?: string | null;
}): string {
  return [
    row.normalizedName ?? normalizeLocationSearch(row.name) ?? '',
    normalizeLocationSearch(row.voivodeship) ?? '',
    normalizeLocationSearch(row.county) ?? '',
    normalizeLocationSearch(row.municipality) ?? '',
  ].join('|');
}

function buildSearchText(row: {
  name?: string;
  municipality?: string | null;
  county?: string | null;
  voivodeship?: string | null;
}): string {
  return [
    normalizeLocationSearch(row.name),
    normalizeLocationSearch(row.municipality),
    normalizeLocationSearch(row.county),
    normalizeLocationSearch(row.voivodeship),
  ]
    .filter(Boolean)
    .join(' ');
}
