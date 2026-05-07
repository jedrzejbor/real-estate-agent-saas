import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LocationsImportService } from './locations-import.service';

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      'Usage: pnpm --filter api import:locations <path> [--delimiter=;] [--source=prg] [--deactivate-missing]',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const importer = app.get(LocationsImportService);
    const result = await importer.importFromFile({
      filePath,
      delimiter: getArgValue('--delimiter') ?? ';',
      source: getArgValue('--source') ?? 'import',
      deactivateMissing: process.argv.includes('--deactivate-missing'),
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
