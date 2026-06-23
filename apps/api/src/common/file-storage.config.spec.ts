import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  PUBLIC_UPLOADS_PREFIX,
  buildPublicUploadUrl,
  getFileStorageConfig,
  getLocalPrivateStorageRoot,
  getLocalPublicUploadDirectory,
  registerLocalPublicUploadAssets,
} from './file-storage.config';

describe('file-storage config', () => {
  it('uses local storage defaults for non-production environments', () => {
    const config = getFileStorageConfig(
      {
        NODE_ENV: 'test',
        API_PUBLIC_URL: 'https://api.estateflow.test/',
      },
      '/app',
    );

    expect(config).toMatchObject({
      driver: 'local',
      nodeEnv: 'test',
      localPublicRoot: '/app/uploads',
      localPrivateRoot: '/app/private-uploads',
      publicBaseUrl: 'https://api.estateflow.test/',
      allowLocalInProduction: false,
    });
  });

  it('builds public upload URLs from the configured public base URL', () => {
    expect(
      buildPublicUploadUrl('listings', 'photo.webp', {
        NODE_ENV: 'test',
        FILE_STORAGE_PUBLIC_BASE_URL: 'https://cdn.estateflow.test/',
      }),
    ).toBe('https://cdn.estateflow.test/uploads/listings/photo.webp');
  });

  it('resolves local public and private roots from explicit env values', () => {
    const env = {
      NODE_ENV: 'test',
      FILE_STORAGE_LOCAL_PUBLIC_ROOT: 'public-files',
      FILE_STORAGE_LOCAL_PRIVATE_ROOT: 'private-files',
    };

    expect(getLocalPublicUploadDirectory('public-submissions', env)).toBe(
      join(process.cwd(), 'public-files', 'public-submissions'),
    );
    expect(getLocalPrivateStorageRoot('listing-documents', env)).toBe(
      join(process.cwd(), 'private-files', 'listing-documents'),
    );
  });

  it('blocks local storage in production unless explicitly allowed', () => {
    expect(() =>
      getFileStorageConfig({
        NODE_ENV: 'production',
      }),
    ).toThrow(/Local file storage is disabled in production/);

    expect(
      getFileStorageConfig({
        NODE_ENV: 'production',
        FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION: 'true',
      }).allowLocalInProduction,
    ).toBe(true);
  });

  it('rejects unsupported storage drivers until an object storage adapter exists', () => {
    expect(() =>
      getFileStorageConfig({
        NODE_ENV: 'test',
        STORAGE_DRIVER: 's3',
      }),
    ).toThrow(/Unsupported FILE_STORAGE_DRIVER/);
  });

  it('rejects unsafe public filenames and private namespaces', () => {
    expect(() =>
      buildPublicUploadUrl('listings', '../photo.webp', { NODE_ENV: 'test' }),
    ).toThrow(/Invalid file storage segment/);
    expect(() =>
      getLocalPrivateStorageRoot('listing-documents/agent-1', {
        NODE_ENV: 'test',
      }),
    ).toThrow(/Invalid file storage segment/);
  });

  it('registers the local public upload directory as static assets', () => {
    const root = mkdtempSync(join(tmpdir(), 'estateflow-storage-'));
    const app = {
      useStaticAssets: jest.fn(),
    };

    try {
      const config = registerLocalPublicUploadAssets(app as never, {
        NODE_ENV: 'test',
        FILE_STORAGE_LOCAL_PUBLIC_ROOT: root,
      });

      expect(config.localPublicRoot).toBe(root);
      expect(app.useStaticAssets).toHaveBeenCalledWith(root, {
        prefix: PUBLIC_UPLOADS_PREFIX,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
