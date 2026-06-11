import { BadRequestException } from '@nestjs/common';
import {
  assertSafeDocumentUpload,
  getDocumentExtension,
} from './document-upload-security';

describe('document upload security', () => {
  it('accepts a PDF matching its magic bytes', () => {
    expect(() =>
      assertSafeDocumentUpload({
        buffer: Buffer.from('%PDF-1.7 document'),
        mimetype: 'application/pdf',
        originalname: 'umowa.pdf',
        size: 1024,
      }),
    ).not.toThrow();
  });

  it('accepts a PNG matching its magic bytes', () => {
    expect(() =>
      assertSafeDocumentUpload({
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]),
        mimetype: 'image/png',
        originalname: 'rzut.png',
        size: 1024,
      }),
    ).not.toThrow();
  });

  it('accepts a JPEG matching its magic bytes', () => {
    expect(() =>
      assertSafeDocumentUpload({
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
        mimetype: 'image/jpeg',
        originalname: 'skan.jpg',
        size: 1024,
      }),
    ).not.toThrow();
  });

  it('rejects a file whose content does not match declared MIME type', () => {
    expect(() =>
      assertSafeDocumentUpload({
        buffer: Buffer.from('not a pdf'),
        mimetype: 'application/pdf',
        originalname: 'fake.pdf',
        size: 1024,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported document types', () => {
    expect(() =>
      assertSafeDocumentUpload({
        buffer: Buffer.from('plain text'),
        mimetype: 'text/plain',
        originalname: 'notes.txt',
        size: 1024,
      }),
    ).toThrow(BadRequestException);
  });

  it('normalizes extension from MIME type when original filename has no extension', () => {
    expect(getDocumentExtension('document', 'application/pdf')).toBe('.pdf');
    expect(getDocumentExtension('scan', 'image/jpeg')).toBe('.jpg');
    expect(getDocumentExtension('rzut', 'image/png')).toBe('.png');
  });
});
