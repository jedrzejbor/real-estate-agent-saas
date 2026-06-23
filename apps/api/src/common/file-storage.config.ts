import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

export const PUBLIC_UPLOADS_PREFIX = '/uploads/';

export const PUBLIC_UPLOAD_CATEGORIES = {
  LISTINGS: 'listings',
  PUBLIC_SUBMISSIONS: 'public-submissions',
} as const;

export type PublicUploadCategory =
  (typeof PUBLIC_UPLOAD_CATEGORIES)[keyof typeof PUBLIC_UPLOAD_CATEGORIES];

type FileStorageDriver = 'local';

type EnvReader = {
  get<T = string>(key: string): T | undefined;
};

type EnvSource = EnvReader | NodeJS.ProcessEnv;

export interface FileStorageConfig {
  driver: FileStorageDriver;
  nodeEnv: string;
  localPublicRoot: string;
  localPrivateRoot: string;
  publicBaseUrl: string;
  allowLocalInProduction: boolean;
}

export function getFileStorageConfig(
  source: EnvSource = process.env,
  cwd = process.cwd(),
): FileStorageConfig {
  const nodeEnv = readConfigValue(source, 'NODE_ENV') ?? 'development';
  const driver = normalizeStorageDriver(
    readConfigValue(source, 'FILE_STORAGE_DRIVER') ??
      readConfigValue(source, 'STORAGE_DRIVER'),
  );
  const allowLocalInProduction =
    parseBooleanConfig(
      readConfigValue(source, 'FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION'),
    ) ||
    parseBooleanConfig(
      readConfigValue(source, 'ALLOW_LOCAL_FILE_STORAGE_IN_PRODUCTION'),
    );

  if (
    nodeEnv === 'production' &&
    driver === 'local' &&
    !allowLocalInProduction
  ) {
    throw new Error(
      'Local file storage is disabled in production. Configure S3/R2 storage before public launch or set FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true for an explicit beta exception.',
    );
  }

  return {
    driver,
    nodeEnv,
    localPublicRoot: resolve(
      cwd,
      readConfigValue(source, 'FILE_STORAGE_LOCAL_PUBLIC_ROOT') ??
        readConfigValue(source, 'UPLOADS_DIR') ??
        'uploads',
    ),
    localPrivateRoot: resolve(
      cwd,
      readConfigValue(source, 'FILE_STORAGE_LOCAL_PRIVATE_ROOT') ??
        readConfigValue(source, 'PRIVATE_UPLOADS_DIR') ??
        'private-uploads',
    ),
    publicBaseUrl: getPublicBaseUrl(source),
    allowLocalInProduction,
  };
}

export function registerLocalPublicUploadAssets(
  app: NestExpressApplication,
  source: EnvSource = process.env,
): FileStorageConfig {
  const config = getFileStorageConfig(source);

  if (!existsSync(config.localPublicRoot)) {
    mkdirSync(config.localPublicRoot, { recursive: true });
  }

  app.useStaticAssets(config.localPublicRoot, {
    prefix: PUBLIC_UPLOADS_PREFIX,
  });

  return config;
}

export function getLocalPublicUploadDirectory(
  category: PublicUploadCategory,
  source: EnvSource = process.env,
): string {
  return join(getFileStorageConfig(source).localPublicRoot, category);
}

export function getLocalPrivateStorageRoot(
  namespace: string,
  source: EnvSource = process.env,
): string {
  assertSafeStorageSegment(namespace);
  return join(getFileStorageConfig(source).localPrivateRoot, namespace);
}

export function buildPublicUploadUrl(
  category: PublicUploadCategory,
  filename: string,
  source: EnvSource = process.env,
): string {
  assertSafeStorageSegment(filename);
  const baseUrl = getFileStorageConfig(source).publicBaseUrl.replace(
    /\/+$/,
    '',
  );

  return `${baseUrl}${PUBLIC_UPLOADS_PREFIX}${category}/${filename}`;
}

function getPublicBaseUrl(source: EnvSource): string {
  const configuredBaseUrl =
    readConfigValue(source, 'FILE_STORAGE_PUBLIC_BASE_URL') ??
    readConfigValue(source, 'S3_PUBLIC_URL') ??
    readConfigValue(source, 'API_PUBLIC_URL') ??
    readConfigValue(source, 'PUBLIC_API_URL');

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return `http://localhost:${readConfigValue(source, 'PORT') ?? '4000'}`;
}

function normalizeStorageDriver(value: string | undefined): FileStorageDriver {
  const driver = value?.trim().toLowerCase() || 'local';

  if (driver !== 'local') {
    throw new Error(
      `Unsupported FILE_STORAGE_DRIVER "${value}". This release supports local storage only; production object storage adapter must be implemented before switching drivers.`,
    );
  }

  return driver;
}

function parseBooleanConfig(value: string | undefined): boolean {
  if (!value) return false;

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function readConfigValue(source: EnvSource, key: string): string | undefined {
  if ('get' in source && typeof source.get === 'function') {
    const value = source.get<string>(key);
    return typeof value === 'string' ? value : undefined;
  }

  return (source as NodeJS.ProcessEnv)[key];
}

function assertSafeStorageSegment(segment: string): void {
  if (
    segment.length === 0 ||
    segment.includes('/') ||
    segment.includes('\\') ||
    segment.includes('..')
  ) {
    throw new Error('Invalid file storage segment');
  }
}
