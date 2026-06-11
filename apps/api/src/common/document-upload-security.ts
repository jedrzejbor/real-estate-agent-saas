import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface DocumentUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
]);

export function assertSafeDocumentUpload(file: DocumentUploadFile): void {
  if (!file.buffer?.length) {
    throw new BadRequestException('Plik dokumentu jest pusty');
  }

  if (
    typeof file.size === 'number' &&
    file.size > MAX_DOCUMENT_UPLOAD_SIZE_BYTES
  ) {
    throw new BadRequestException('Plik dokumentu przekracza limit 15 MB');
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Dozwolone formaty dokumentów to PDF, JPG i PNG');
  }

  const extension = extname(file.originalname).toLowerCase();
  if (extension && !ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Nieprawidłowe rozszerzenie pliku dokumentu');
  }

  if (!matchesDocumentSignature(file.buffer, file.mimetype)) {
    throw new BadRequestException(
      'Zawartość pliku nie pasuje do formatu dokumentu',
    );
  }
}

export function getDocumentExtension(
  originalname: string,
  mimetype: string,
): string {
  const extension = extname(originalname).toLowerCase();

  if (ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    return extension;
  }

  if (mimetype === 'application/pdf') return '.pdf';
  if (mimetype === 'image/jpeg') return '.jpg';
  if (mimetype === 'image/png') return '.png';

  throw new BadRequestException('Nieobsługiwany format dokumentu');
}

function matchesDocumentSignature(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case 'application/pdf':
      return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    default:
      return false;
  }
}
