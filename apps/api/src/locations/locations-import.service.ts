import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import { createInterface } from 'readline';
import { In, Repository } from 'typeorm';
import { Location } from './entities';
import { normalizeLocationSearch } from './locations-normalization';

interface ImportLocationRow {
  name: string;
  municipality?: string | null;
  parentName?: string | null;
  county?: string | null;
  voivodeship: string;
  kind?: string | null;
  kindCode?: string | null;
  simcCode?: string | null;
  lat: number;
  lng: number;
  priority?: number | null;
  source?: string | null;
}

interface ImportPrngLocationsOptions {
  count?: number;
  maxPages?: number;
  source?: string;
  deactivateMissing?: boolean;
  layers?: PrngLayerName[];
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

type PrngLayerName =
  | 'M1_UrzedoweNazwyMiejscowosci'
  | 'M2_PozostaleNazwyMiejscowosci';

const PRNG_WFS_URL =
  'https://mapy.geoportal.gov.pl/wss/service/PZGiK/PRNG/WFS/GeographicalNames';
const DEFAULT_PRNG_LAYERS: PrngLayerName[] = [
  'M1_UrzedoweNazwyMiejscowosci',
  'M2_PozostaleNazwyMiejscowosci',
];

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

  async importFromPrngWfs(
    options: ImportPrngLocationsOptions = {},
  ): Promise<ImportLocationsResult> {
    const count = options.count ?? 1000;
    const layers = options.layers ?? DEFAULT_PRNG_LAYERS;
    const source = options.source ?? 'prng';
    const total: ImportLocationsResult = {
      processed: 0,
      imported: 0,
      skipped: 0,
      deactivated: 0,
    };

    for (const layer of layers) {
      const layerSource = `${source}-${layer.startsWith('M1_') ? 'm1' : 'm2'}`;
      const layerResult = await this.importPrngLayer({
        layer,
        count,
        maxPages: options.maxPages,
        source: layerSource,
        deactivateMissing: options.deactivateMissing,
      });

      total.processed += layerResult.processed;
      total.imported += layerResult.imported;
      total.skipped += layerResult.skipped;
      total.deactivated += layerResult.deactivated;
    }

    return total;
  }

  private async importPrngLayer({
    layer,
    count,
    maxPages,
    source,
    deactivateMissing,
  }: {
    layer: PrngLayerName;
    count: number;
    maxPages?: number;
    source: string;
    deactivateMissing?: boolean;
  }): Promise<ImportLocationsResult> {
    const result: ImportLocationsResult = {
      processed: 0,
      imported: 0,
      skipped: 0,
      deactivated: 0,
    };
    const seenKeys = new Set<string>();
    let startIndex = 0;
    let pageIndex = 0;

    while (true) {
      if (maxPages !== undefined && pageIndex >= maxPages) {
        break;
      }

      const page = await fetchPrngLayerPage({ layer, count, startIndex });
      const rows = parsePrngLocationRows(page, source);

      if (rows.length === 0) {
        break;
      }

      result.processed += rows.length;
      const validRows = rows.filter((row) => {
        const valid = isValidLocationRow(row);
        if (!valid) {
          result.skipped += 1;
        }
        return valid;
      });

      for (const row of validRows) {
        if (row.simcCode) {
          seenKeys.add(`simc:${row.simcCode}`);
        } else {
          seenKeys.add(`natural:${buildNaturalKey(row)}`);
        }
      }

      result.imported += await this.upsertBatch(validRows);
      this.logger.log(
        `Imported PRNG ${layer}: startIndex=${startIndex}, rows=${rows.length}`,
      );

      if (rows.length < count || !hasNextWfsPage(page)) {
        break;
      }

      startIndex += count;
      pageIndex += 1;
    }

    if (deactivateMissing) {
      result.deactivated = await this.deactivateMissing(source, seenKeys);
    }

    this.logger.log(
      `PRNG layer import completed: layer=${layer}, processed=${result.processed}, imported=${result.imported}, skipped=${result.skipped}, deactivated=${result.deactivated}`,
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
        parentName: row.parentName?.trim() || null,
        county: row.county?.trim() || null,
        voivodeship: row.voivodeship.trim(),
        kind: normalizeLocationKind(row.kind, row.kindCode),
        kindCode: row.kindCode?.trim() || null,
        simcCode: row.simcCode?.trim() || null,
        lat: row.lat,
        lng: row.lng,
        priority: row.priority ?? 50,
        source: row.source ?? 'import',
        active: true,
      }),
    );

    const uniqueEntities = dedupeLocationsForUniqueConstraints(entities);

    if (uniqueEntities.length === 0) {
      return 0;
    }

    const existingByNaturalKey =
      await this.findExistingIdsByNaturalKey(uniqueEntities);
    const existingBySimc = await this.findExistingIdsBySimc(uniqueEntities);
    const saveableEntities = uniqueEntities.filter((entity) => {
      const existingNaturalKeyId = existingByNaturalKey.get(entity.naturalKey);
      const existingSimcId = entity.simcCode
        ? existingBySimc.get(entity.simcCode)
        : null;

      if (
        existingNaturalKeyId &&
        existingSimcId &&
        existingNaturalKeyId !== existingSimcId
      ) {
        this.logger.warn(
          `Skipping location with conflicting unique keys: naturalKey=${entity.naturalKey}, simcCode=${entity.simcCode}`,
        );
        return false;
      }

      const existingId = existingNaturalKeyId ?? existingSimcId;
      if (existingId) {
        entity.id = existingId;
      }

      return true;
    });

    if (saveableEntities.length > 0) {
      await this.locationRepo.save(saveableEntities);
    }

    return saveableEntities.length;
  }

  private async findExistingIdsBySimc(
    entities: Location[],
  ): Promise<Map<string, string>> {
    const simcCodes = entities
      .map((entity) => entity.simcCode)
      .filter((simcCode): simcCode is string => Boolean(simcCode));

    const existing = await this.locationRepo.find({
      where: { simcCode: In(simcCodes) },
      select: ['id', 'simcCode'],
    });

    return new Map(
      existing.flatMap((location) =>
        location.simcCode ? [[location.simcCode, location.id]] : [],
      ),
    );
  }

  private async findExistingIdsByNaturalKey(
    entities: Location[],
  ): Promise<Map<string, string>> {
    const naturalKeys = entities.map((entity) => entity.naturalKey);

    const existing = await this.locationRepo.find({
      where: { naturalKey: In(naturalKeys) },
      select: ['id', 'naturalKey'],
    });

    return new Map(
      existing.map((location) => [location.naturalKey, location.id]),
    );
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
        'parentName',
        'kind',
        'kindCode',
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
    municipality: getOptionalString(record, [
      'municipality',
      'commune',
      'gmina',
    ]),
    parentName: getOptionalString(record, [
      'parent_name',
      'parentname',
      'nazwa_miejscowosci_nadr',
      'nadrzedna',
    ]),
    county: getOptionalString(record, ['county', 'district', 'powiat']),
    voivodeship: getRequiredString(record, [
      'voivodeship',
      'province',
      'wojewodztwo',
    ]),
    kind: getOptionalString(record, [
      'kind',
      'type',
      'rodzaj',
      'typ',
      'nazwa_rodzaju',
      'rodzaj_miejscowosci',
      'typ_miejscowosci',
    ]),
    kindCode: getOptionalString(record, [
      'kind_code',
      'kindcode',
      'type_code',
      'typecode',
      'rm',
      'rodzaj_kod',
      'symbol_rodzaju',
    ]),
    simcCode: getOptionalString(record, [
      'simc_code',
      'simccode',
      'simc',
      'sym',
    ]),
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

async function fetchPrngLayerPage({
  layer,
  count,
  startIndex,
}: {
  layer: PrngLayerName;
  count: number;
  startIndex: number;
}): Promise<string> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: `ms:${layer}`,
    srsName: 'EPSG:4326',
    count: String(count),
    startIndex: String(startIndex),
  });
  const response = await fetch(`${PRNG_WFS_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      `PRNG WFS request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function parsePrngLocationRows(
  gml: string,
  source: string,
): ImportLocationRow[] {
  const rows: ImportLocationRow[] = [];
  const featureMatches = gml.matchAll(
    /<ms:(M[12]_[^>\s]+)[^>]*>([\s\S]*?)<\/ms:\1>/g,
  );

  for (const match of featureMatches) {
    const feature = match[2];
    const point = getPrngPoint(feature);
    const name = getXmlTagValue(feature, 'NAZWAGLOWNA');
    const voivodeship = getXmlTagValue(feature, 'WOJEWODZTWO');

    if (!point || !name || !voivodeship) {
      continue;
    }

    rows.push({
      name,
      municipality: getXmlTagValue(feature, 'GMINA'),
      parentName: getXmlTagValue(feature, 'NAZWAMIEJSCOWOSCINADR'),
      county: getXmlTagValue(feature, 'POWIAT'),
      voivodeship,
      kind: getXmlTagValue(feature, 'RODZAJOBIEKTU'),
      simcCode: getXmlTagValue(feature, 'IDENTYFIKATORSIMC'),
      lat: point.lat,
      lng: point.lng,
      priority: getPrngPriority(feature),
      source,
    });
  }

  return rows;
}

function getPrngPoint(feature: string): { lat: number; lng: number } | null {
  const pos = getXmlTagValue(feature, 'pos');
  if (!pos) {
    return null;
  }

  const [lat, lng] = pos.split(/\s+/).map((value) => Number(value));

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function getPrngPriority(feature: string): number {
  const status = normalizeLocationSearch(
    getXmlTagValue(feature, 'STATUSNAZWY'),
  );
  const kind = normalizeLocationSearch(
    getXmlTagValue(feature, 'RODZAJOBIEKTU'),
  );

  if (status === 'urzedowa' && kind === 'miasto') {
    return 95;
  }

  if (status === 'urzedowa' && kind === 'wies') {
    return 80;
  }

  if (status === 'urzedowa') {
    return 70;
  }

  return 35;
}

function getXmlTagValue(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<[^:>]+:${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]+:${tag}>`),
  );
  const value = match?.[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();

  return value || null;
}

function hasNextWfsPage(gml: string): boolean {
  return /\snext=/.test(gml);
}

function buildNaturalKey(row: {
  normalizedName?: string;
  name?: string;
  voivodeship?: string | null;
  county?: string | null;
  municipality?: string | null;
  parentName?: string | null;
  kind?: string | null;
  kindCode?: string | null;
}): string {
  return [
    row.normalizedName ?? normalizeLocationSearch(row.name) ?? '',
    normalizeLocationSearch(row.voivodeship) ?? '',
    normalizeLocationSearch(row.county) ?? '',
    normalizeLocationSearch(row.municipality) ?? '',
    normalizeLocationSearch(row.parentName) ?? '',
    normalizeLocationSearch(row.kind) ?? '',
    normalizeLocationSearch(row.kindCode) ?? '',
  ].join('|');
}

function buildSearchText(row: {
  name?: string;
  municipality?: string | null;
  parentName?: string | null;
  county?: string | null;
  voivodeship?: string | null;
  kind?: string | null;
  kindCode?: string | null;
}): string {
  return [
    normalizeLocationSearch(row.name),
    normalizeLocationSearch(row.municipality),
    normalizeLocationSearch(row.parentName),
    normalizeLocationSearch(row.county),
    normalizeLocationSearch(row.voivodeship),
    normalizeLocationSearch(normalizeLocationKind(row.kind, row.kindCode)),
    normalizeLocationSearch(row.kindCode),
  ]
    .filter(Boolean)
    .join(' ');
}

function dedupeLocationsForUniqueConstraints(entities: Location[]): Location[] {
  const seenNaturalKeys = new Set<string>();
  const seenSimcCodes = new Set<string>();
  const deduped: Location[] = [];

  for (const entity of entities) {
    if (seenNaturalKeys.has(entity.naturalKey)) {
      continue;
    }

    if (entity.simcCode && seenSimcCodes.has(entity.simcCode)) {
      continue;
    }

    seenNaturalKeys.add(entity.naturalKey);

    if (entity.simcCode) {
      seenSimcCodes.add(entity.simcCode);
    }

    deduped.push(entity);
  }

  return deduped;
}

function normalizeLocationKind(
  value?: string | null,
  code?: string | null,
): string {
  const normalizedValue = normalizeLocationSearch(value);

  if (!normalizedValue && code) {
    return mapSimcKindCode(code);
  }

  if (!normalizedValue) {
    return 'miejscowość';
  }

  const aliases: Record<string, string> = {
    city: 'miasto',
    town: 'miasto',
    village: 'wieś',
    settlement: 'osada',
    hamlet: 'przysiółek',
    colony: 'kolonia',
    part: 'część miejscowości',
    locality: 'miejscowość',
    miasto: 'miasto',
    wies: 'wieś',
    osada: 'osada',
    przysiolek: 'przysiółek',
    kolonia: 'kolonia',
    'czesc miejscowosci': 'część miejscowości',
    'czesc miasta': 'część miasta',
    'czesc wsi': 'część wsi',
  };

  return aliases[normalizedValue] ?? value?.trim() ?? 'miejscowość';
}

function mapSimcKindCode(code: string): string {
  const normalizedCode = code.trim();
  const simcKindLabels: Record<string, string> = {
    '01': 'wieś',
    '02': 'kolonia',
    '03': 'przysiółek',
    '04': 'osada',
    '05': 'osada leśna',
    '06': 'osiedle',
    '07': 'schronisko turystyczne',
    '95': 'dzielnica',
    '96': 'delegatura',
    '98': 'część miejscowości',
    '99': 'miasto',
  };

  return simcKindLabels[normalizedCode] ?? 'miejscowość';
}
