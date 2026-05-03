import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface ImageUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function assertSafeImageUpload(file: ImageUploadFile): void {
  if (!file.buffer?.length) {
    throw new BadRequestException('Plik zdjęcia jest pusty');
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      'Dozwolone formaty zdjęć to JPG, PNG oraz WebP',
    );
  }

  const extension = extname(file.originalname).toLowerCase();
  if (extension && !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw new BadRequestException('Nieprawidłowe rozszerzenie pliku zdjęcia');
  }

  if (!matchesImageSignature(file.buffer, file.mimetype)) {
    throw new BadRequestException(
      'Zawartość pliku nie pasuje do formatu zdjęcia',
    );
  }
}

function matchesImageSignature(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
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
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
}
