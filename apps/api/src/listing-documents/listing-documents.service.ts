import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  ListingStatus,
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
  checklist: ListingDocumentChecklistResponse;
}

export interface ListingDocumentChecklistItem {
  category: ListingDocumentCategory;
  required: boolean;
  status: ListingDocumentStatus;
  documentId: string | null;
  displayName: string;
}

export interface ListingDocumentChecklistResponse {
  items: ListingDocumentChecklistItem[];
  summary: {
    required: number;
    approved: number;
    missing: number;
    needsCorrection: number;
    completionPct: number;
  };
}

export interface ListingDocumentDownload {
  stream: Readable;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export type ListingDocumentAttentionKind =
  | 'missing_required'
  | 'needs_correction'
  | 'overdue'
  | 'expired';

export interface ListingDocumentAttentionItem {
  id: string;
  kind: ListingDocumentAttentionKind;
  listingId: string;
  listingTitle: string;
  documentId: string | null;
  documentName: string | null;
  count: number;
  dueDate: string | null;
  createdAt: string;
}

export interface ListingDocumentAttentionSummary {
  total: number;
  missingRequired: number;
  needsCorrection: number;
  overdue: number;
  expired: number;
  items: ListingDocumentAttentionItem[];
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
    const listing = await this.assertListingAccess(listingId, agent.id);

    const documents = await this.documentRepo.find({
      where: { listingId, agentId: agent.id },
      order: { createdAt: 'DESC' },
    });

    return {
      documents: documents.map((document) => this.toView(document)),
      checklist: this.buildChecklist(listing, documents),
    };
  }

  async getChecklist(
    listingId: string,
    userId: string,
  ): Promise<ListingDocumentChecklistResponse> {
    const agent = await this.resolveAgent(userId);
    const listing = await this.assertListingAccess(listingId, agent.id);
    const documents = await this.documentRepo.find({
      where: { listingId, agentId: agent.id },
      order: { createdAt: 'DESC' },
    });

    return this.buildChecklist(listing, documents);
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

  async getAttentionSummaryForAgent(
    agentId: string,
  ): Promise<ListingDocumentAttentionSummary> {
    const activeListings = await this.listingRepo.find({
      where: { agentId, status: ListingStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
      take: 100,
    });

    if (activeListings.length === 0) {
      return createEmptyAttentionSummary();
    }

    const listingIds = activeListings.map((listing) => listing.id);
    const documents = await this.documentRepo.find({
      where: { agentId, listingId: In(listingIds) },
      order: { updatedAt: 'DESC' },
    });
    const now = new Date();
    const documentsByListing = groupDocumentsByListing(documents);
    const items: ListingDocumentAttentionItem[] = [];
    let missingRequired = 0;
    let needsCorrection = 0;
    let overdue = 0;
    let expired = 0;

    for (const listing of activeListings) {
      const listingDocuments = documentsByListing.get(listing.id) ?? [];
      const checklist = this.buildChecklist(listing, listingDocuments);

      if (checklist.summary.missing > 0) {
        missingRequired += checklist.summary.missing;
        items.push({
          id: `listing-documents-missing-${listing.id}`,
          kind: 'missing_required',
          listingId: listing.id,
          listingTitle: listing.title,
          documentId: null,
          documentName: null,
          count: checklist.summary.missing,
          dueDate: null,
          createdAt: toAttentionDate(listing.updatedAt ?? listing.createdAt),
        });
      }

      for (const document of listingDocuments) {
        if (document.status === ListingDocumentStatus.NEEDS_CORRECTION) {
          needsCorrection += 1;
          items.push(
            this.toAttentionItem('needs_correction', listing, document),
          );
          continue;
        }

        if (document.status === ListingDocumentStatus.EXPIRED) {
          expired += 1;
          items.push(this.toAttentionItem('expired', listing, document));
          continue;
        }

        if (document.expiresAt && document.expiresAt < now) {
          expired += 1;
          items.push(this.toAttentionItem('expired', listing, document));
          continue;
        }

        if (
          document.dueDate &&
          document.dueDate < now &&
          document.status !== ListingDocumentStatus.APPROVED
        ) {
          overdue += 1;
          items.push(this.toAttentionItem('overdue', listing, document));
        }
      }
    }

    items.sort((left, right) => {
      const priorityDiff =
        getAttentionPriority(right.kind) - getAttentionPriority(left.kind);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });

    return {
      total: missingRequired + needsCorrection + overdue + expired,
      missingRequired,
      needsCorrection,
      overdue,
      expired,
      items: items.slice(0, 8),
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

  private toAttentionItem(
    kind: Exclude<ListingDocumentAttentionKind, 'missing_required'>,
    listing: Listing,
    document: ListingDocument,
  ): ListingDocumentAttentionItem {
    return {
      id: `listing-document-${kind}-${document.id}`,
      kind,
      listingId: listing.id,
      listingTitle: listing.title,
      documentId: document.id,
      documentName: document.displayName,
      count: 1,
      dueDate: toIsoOrNull(document.dueDate ?? document.expiresAt),
      createdAt: toAttentionDate(document.updatedAt ?? document.createdAt),
    };
  }

  private resolveStoragePath(storageKey: string): string {
    const filePath = resolve(this.storageRoot, storageKey);

    if (!filePath.startsWith(`${this.storageRoot}/`)) {
      throw new BadRequestException('Nieprawidłowa ścieżka dokumentu');
    }

    return filePath;
  }

  private buildChecklist(
    listing: Listing,
    documents: ListingDocument[],
  ): ListingDocumentChecklistResponse {
    const requirements = getDocumentRequirements(listing);
    const byCategory = new Map<ListingDocumentCategory, ListingDocument>();

    for (const document of documents) {
      const current = byCategory.get(document.category);
      if (!current || rankStatus(document.status) > rankStatus(current.status)) {
        byCategory.set(document.category, document);
      }
    }

    const items = requirements.map((requirement) => {
      const document = byCategory.get(requirement.category);

      return {
        category: requirement.category,
        required: requirement.required,
        status: document?.status ?? ListingDocumentStatus.MISSING,
        documentId: document?.id ?? null,
        displayName: requirement.displayName,
      };
    });

    const requiredItems = items.filter((item) => item.required);
    const approved = requiredItems.filter(
      (item) => item.status === ListingDocumentStatus.APPROVED,
    ).length;
    const missing = requiredItems.filter(
      (item) => item.status === ListingDocumentStatus.MISSING,
    ).length;
    const needsCorrection = requiredItems.filter(
      (item) => item.status === ListingDocumentStatus.NEEDS_CORRECTION,
    ).length;

    return {
      items,
      summary: {
        required: requiredItems.length,
        approved,
        missing,
        needsCorrection,
        completionPct:
          requiredItems.length > 0
            ? Math.round((approved / requiredItems.length) * 100)
            : 0,
      },
    };
  }
}

function createEmptyAttentionSummary(): ListingDocumentAttentionSummary {
  return {
    total: 0,
    missingRequired: 0,
    needsCorrection: 0,
    overdue: 0,
    expired: 0,
    items: [],
  };
}

function groupDocumentsByListing(
  documents: ListingDocument[],
): Map<string, ListingDocument[]> {
  const grouped = new Map<string, ListingDocument[]>();

  for (const document of documents) {
    const current = grouped.get(document.listingId) ?? [];
    current.push(document);
    grouped.set(document.listingId, current);
  }

  return grouped;
}

function getAttentionPriority(kind: ListingDocumentAttentionKind): number {
  const priorities: Record<ListingDocumentAttentionKind, number> = {
    overdue: 400,
    expired: 350,
    needs_correction: 300,
    missing_required: 200,
  };

  return priorities[kind];
}

interface ListingDocumentRequirement {
  category: ListingDocumentCategory;
  displayName: string;
  required: boolean;
}

const BASE_DOCUMENT_REQUIREMENTS: ListingDocumentRequirement[] = [
  {
    category: ListingDocumentCategory.AGENCY_AGREEMENT,
    displayName: 'Umowa pośrednictwa',
    required: true,
  },
  {
    category: ListingDocumentCategory.ENERGY_CERTIFICATE,
    displayName: 'Świadectwo energetyczne',
    required: true,
  },
  {
    category: ListingDocumentCategory.FLOOR_PLAN,
    displayName: 'Rzut lokalu',
    required: false,
  },
  {
    category: ListingDocumentCategory.POWER_OF_ATTORNEY,
    displayName: 'Pełnomocnictwo',
    required: false,
  },
];

const SALE_DOCUMENT_REQUIREMENTS: ListingDocumentRequirement[] = [
  {
    category: ListingDocumentCategory.LAND_AND_MORTGAGE_REGISTER,
    displayName: 'Księga wieczysta / numer KW',
    required: true,
  },
  {
    category: ListingDocumentCategory.OWNERSHIP_DEED,
    displayName: 'Akt własności / podstawa nabycia',
    required: true,
  },
  {
    category: ListingDocumentCategory.NO_ARREARS_CERTIFICATE,
    displayName: 'Zaświadczenie o niezaleganiu',
    required: false,
  },
  {
    category: ListingDocumentCategory.COMMUNITY_DOCUMENTS,
    displayName: 'Dokumenty wspólnoty/spółdzielni',
    required: false,
  },
];

const RENT_DOCUMENT_REQUIREMENTS: ListingDocumentRequirement[] = [
  {
    category: ListingDocumentCategory.OWNERSHIP_DEED,
    displayName: 'Potwierdzenie prawa do lokalu',
    required: true,
  },
  {
    category: ListingDocumentCategory.HANDOVER_PROTOCOL,
    displayName: 'Protokół zdawczo-odbiorczy',
    required: false,
  },
];

function getDocumentRequirements(listing: Listing): ListingDocumentRequirement[] {
  const transactionRequirements =
    listing.transactionType === 'sale'
      ? SALE_DOCUMENT_REQUIREMENTS
      : RENT_DOCUMENT_REQUIREMENTS;

  return [...BASE_DOCUMENT_REQUIREMENTS, ...transactionRequirements];
}

function rankStatus(status: ListingDocumentStatus): number {
  const rank: Record<ListingDocumentStatus, number> = {
    missing: 0,
    requested: 1,
    needs_correction: 2,
    uploaded: 3,
    in_review: 4,
    expired: 4,
    approved: 5,
  };

  return rank[status];
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

function toAttentionDate(value?: Date | null): string {
  return (value ?? new Date(0)).toISOString();
}

function sanitizeOriginalFilename(value: string): string {
  return value.trim().replace(/[^\w.\- ]+/g, '_').slice(0, 255);
}
