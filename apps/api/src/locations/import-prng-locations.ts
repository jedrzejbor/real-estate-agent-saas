import { NestFactory } from '@nestjs/core';
import { LocationsImportModule } from './locations-import.module';
import { LocationsImportService } from './locations-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(
    LocationsImportModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  try {
    const importer = app.get(LocationsImportService);
    const result = await importer.importFromPrngWfs({
      count: Number(getArgValue('--count') ?? 1000),
      maxPages: getOptionalNumberArg('--max-pages'),
      source: getArgValue('--source') ?? 'prng',
      deactivateMissing: process.argv.includes('--deactivate-missing'),
      layers: getLayersArg(),
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

function getArgValue(name: string): string | null {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function getOptionalNumberArg(name: string): number | undefined {
  const value = getArgValue(name);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getLayersArg():
  | Array<'M1_UrzedoweNazwyMiejscowosci' | 'M2_PozostaleNazwyMiejscowosci'>
  | undefined {
  const layers = getArgValue('--layers');

  if (!layers) {
    return undefined;
  }

  return layers
    .split(',')
    .map((layer) => layer.trim().toUpperCase())
    .flatMap((layer) => {
      if (layer === 'M1') return ['M1_UrzedoweNazwyMiejscowosci'] as const;
      if (layer === 'M2') return ['M2_PozostaleNazwyMiejscowosci'] as const;
      return [];
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
