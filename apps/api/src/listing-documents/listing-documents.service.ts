import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { mkdir, stat, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { dirname, join, resolve } from 'path';
import {
  assertSafeDocumentUpload,
  getDocumentExtension,
  type DocumentUploadFile,
} from '../common/document-upload-security';
import {
  ListingDocumentCategory,
  ListingDocumentEventType,
  ListingDocumentStatus,
} from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersService } from '../users';
import {
  CreateListingDocumentDto,
  UpdateListingDocumentDto,
} from './dto';
import { ListingDocument, ListingDocumentEvent } from './entities';

export interface ListingDocumentView {
  id: string;
  listingId: string;
  category: ListingDocumentCategory;
  status: ListingDocumentStatus;
  displayName: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  note: string | null;
  dueDate: string | null;
  expiresAt: string | null;
  uploadedByUserId: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDocumentsResponse {
  documents: ListingDocumentView[];
}

export interface ListingDocumentDownload {
  stream: Readable;
  filename: string;
  mimeType: string;
  fileSize: number;
}

@Injectable()
export class ListingDocumentsService {
  private readonly storageRoot = resolve(
    process.cwd(),
    'private-uploads',
    'listing-documents',
  );

  constructor(
    @InjectRepository(ListingDocument)
    private readonly documentRepo: Repository<ListingDocument>,
    @InjectRepository(ListingDocumentEvent)
    private readonly eventRepo: Repository<ListingDocumentEvent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    listingId: string,
    userId: string,
  ): Promise<ListingDocumentsResponse> {
    const agent = await this.resolveAgent(userId);
    await this.assertListingAccess(listingId, agent.id);

    const documents = await this.documentRepo.find({
      where: { listingId, agentId: agent.id },
      order: { createdAt: 'DESC' },
    });

    return {
      documents: documents.map((document) => this.toView(document)),
    };
  }

  async findOne(
    listingId: string,
    documentId: string,
    userId: string,
  ): Promise<ListingDocumentView> {
    const agent = await this.resolveAgent(userId);
    const document = await this.findDocumentForAgent(
      listingId,
      documentId,
      agent.id,
    );

    return this.toView(document);
  }

  async createMetadata(
    listingId: string,
    userId: string,
    dto: CreateListingDocumentDto,
  ): Promise<ListingDocumentView> {
    const agent = await this.resolveAgent(userId);
    await this.assertListingAccess(listingId, agent.id);

    const document = this.documentRepo.create({
      agentId: agent.id,
      listingId,
      category: dto.category,
      status: dto.status ?? ListingDocumentStatus.REQUESTED,
      displayName: normalizeDisplayName(dto.displayName),
      note: normalizeNullableText(dto.note),
      dueDate: parseOptionalDate(dto.dueDate),
      expiresAt: parseOptionalDate(dto.expiresAt),
      uploadedByUserId: userId,
    });

    const saved = await this.documentRepo.save(document);
    await this.logEvent(saved, userId, ListingDocumentEventType.METADATA_UPDATED, {
      source: 'metadata_create',
      category: saved.category,
      status: saved.status,
    });

    return this.toView(saved);
  }

  async upload(
    listingId: string,
    userId: string,
    dto: CreateListingDocumentDto,
    file: DocumentUploadFile,
  ): Promise<ListingDocumentView> {
    if (!file) {
      throw new BadRequestException('Plik dokumentu jest wymagany');
    }

    assertSafeDocumentUpload(file);

    const agent = await this.resolveAgent(userId);
    await this.assertListingAccess(listingId, agent.id);

    const extension = getDocumentExtension(file.originalname, file.mimetype);
    const storageKey = join(agent.id, listingId, `${randomUUID()}${extension}`);
    const filePath = this.resolveStoragePath(storageKey);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);

    const displayName =
      normalizeNullableText(dto.displayName) ?? file.originalname.trim();
    const document = this.documentRepo.create({
      agentId: agent.id,
      listingId,
      category: dto.category,
      status: dto.status ?? ListingDocumentStatus.UPLOADED,
      displayName: normalizeDisplayName(displayName),
      originalFilename: sanitizeOriginalFilename(file.originalname),
      mimeType: file.mimetype,
      fileSize: file.size ?? file.buffer.length,
      storageKey,
      checksum: createHash('sha256').update(file.buffer).digest('hex'),
      note: normalizeNullableText(dto.note),
      dueDate: parseOptionalDate(dto.dueDate),
      expiresAt: parseOptionalDate(dto.expiresAt),
      uploadedByUserId: userId,
    });

    const saved = await this.documentRepo.save(document);
    await this.logEvent(saved, userId, ListingDocumentEventType.UPLOADED, {
      category: saved.category,
      status: saved.status,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
    });

    return this.toView(saved);
  }

  async updateMetadata(
    listingId: string,
    documentId: string,
    userId: string,
    dto: UpdateListingDocumentDto,
  ): Promise<ListingDocumentView> {
    const agent = await this.resolveAgent(userId);
    const document = await this.findDocumentForAgent(
      listingId,
      documentId,
      agent.id,
    );
    const previousStatus = document.status;

    if (dto.category !== undefined) {
      document.category = dto.category;
    }

    if (dto.status !== undefined) {
      document.status = dto.status;
      if (dto.status === ListingDocumentStatus.APPROVED) {
        document.reviewedAt = new Date();
        document.reviewedByUserId = userId;
      }
    }

    if (dto.displayName !== undefined) {
      document.displayName = normalizeDisplayName(dto.displayName);
    }

    if (dto.note !== undefined) {
      document.note = normalizeNullableText(dto.note);
    }

    if (dto.dueDate !== undefined) {
      document.dueDate = parseOptionalDate(dto.dueDate);
    }

    if (dto.expiresAt !== undefined) {
      document.expiresAt = parseOptionalDate(dto.expiresAt);
    }

    const saved = await this.documentRepo.save(document);
    const eventType =
      previousStatus !== saved.status
        ? ListingDocumentEventType.STATUS_CHANGED
        : ListingDocumentEventType.METADATA_UPDATED;

    await this.logEvent(saved, userId, eventType, {
      previousStatus,
      status: saved.status,
      category: saved.category,
    });

    return this.toView(saved);
  }

  async remove(
    listingId: string,
    documentId: string,
    userId: string,
  ): Promise<void> {
    const agent = await this.resolveAgent(userId);
    const document = await this.findDocumentForAgent(
      listingId,
      documentId,
      agent.id,
    );

    await this.documentRepo.softDelete(document.id);
    await this.logEvent(document, userId, ListingDocumentEventType.DELETED, {
      category: document.category,
      status: document.status,
    });
  }

  async download(
    listingId: string,
    documentId: string,
    userId: string,
  ): Promise<ListingDocumentDownload> {
    const agent = await this.resolveAgent(userId);
    const document = await this.findDocumentForAgent(
      listingId,
      documentId,
      agent.id,
    );

    if (!document.storageKey || !document.mimeType) {
      throw new BadRequestException('Dokument nie ma jeszcze zapisanego pliku');
    }

    const filePath = this.resolveStoragePath(document.storageKey);
    const fileStats = await stat(filePath).catch(() => null);

    if (!fileStats?.isFile()) {
      throw new NotFoundException('Plik dokumentu nie został znaleziony');
    }

    await this.logEvent(document, userId, ListingDocumentEventType.DOWNLOADED, {
      mimeType: document.mimeType,
      fileSize: fileStats.size,
    });

    return {
      stream: createReadStream(filePath),
      filename: document.originalFilename || `${document.displayName}.pdf`,
      mimeType: document.mimeType,
      fileSize: fileStats.size,
    };
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }

  private async assertListingAccess(
    listingId: string,
    agentId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, agentId },
    });

    if (!listing) {
      throw new NotFoundException('Oferta nie została znaleziona');
    }

    return listing;
  }

  private async findDocumentForAgent(
    listingId: string,
    documentId: string,
    agentId: string,
  ): Promise<ListingDocument> {
    await this.assertListingAccess(listingId, agentId);

    const document = await this.documentRepo.findOne({
      where: { id: documentId, listingId, agentId },
    });

    if (!document) {
      throw new NotFoundException('Dokument nie został znaleziony');
    }

    return document;
  }

  private async logEvent(
    document: ListingDocument,
    actorUserId: string,
    type: ListingDocumentEventType,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const event = this.eventRepo.create({
      documentId: document.id,
      agentId: document.agentId,
      listingId: document.listingId,
      actorUserId,
      type,
      metadata,
    });

    await this.eventRepo.save(event);
  }

  private toView(document: ListingDocument): ListingDocumentView {
    return {
      id: document.id,
      listingId: document.listingId,
      category: document.category,
      status: document.status,
      displayName: document.displayName,
      originalFilename: document.originalFilename ?? null,
      mimeType: document.mimeType ?? null,
      fileSize: document.fileSize ?? null,
      note: document.note ?? null,
      dueDate: toIsoOrNull(document.dueDate),
      expiresAt: toIsoOrNull(document.expiresAt),
      uploadedByUserId: document.uploadedByUserId ?? null,
      reviewedAt: toIsoOrNull(document.reviewedAt),
      reviewedByUserId: document.reviewedByUserId ?? null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private resolveStoragePath(storageKey: string): string {
    const filePath = resolve(this.storageRoot, storageKey);

    if (!filePath.startsWith(`${this.storageRoot}/`)) {
      throw new BadRequestException('Nieprawidłowa ścieżka dokumentu');
    }

    return filePath;
  }
}

function normalizeDisplayName(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('Nazwa dokumentu jest wymagana');
  }

  return normalized;
}

function normalizeNullableText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Nieprawidłowa data dokumentu');
  }

  return date;
}

function toIsoOrNull(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function sanitizeOriginalFilename(value: string): string {
  return value.trim().replace(/[^\w.\- ]+/g, '_').slice(0, 255);
}
