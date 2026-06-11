import { NotFoundException } from '@nestjs/common';
import {
  ListingDocumentCategory,
  ListingDocumentEventType,
  ListingDocumentStatus,
  ListingStatus,
} from '../common/enums';
import { ListingDocumentsService } from './listing-documents.service';

const agent = { id: 'agent-1' };
const userId = 'user-1';
const listingId = 'listing-1';
const documentId = 'document-1';
const now = new Date('2026-06-11T10:00:00.000Z');

describe('ListingDocumentsService', () => {
  function setup() {
    const documentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: value.id ?? documentId,
        createdAt: value.createdAt ?? now,
        updatedAt: value.updatedAt ?? now,
        ...value,
      })),
      softDelete: jest.fn(),
    };
    const eventRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const listingRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const usersService = {
      resolveAgentForUser: jest.fn(async () => agent),
    };

    const service = new ListingDocumentsService(
      documentRepo as never,
      eventRepo as never,
      listingRepo as never,
      usersService as never,
    );

    return { service, documentRepo, eventRepo, listingRepo, usersService };
  }

  it('lists documents only after confirming listing ownership', async () => {
    const { service, documentRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue(buildListing());
    documentRepo.find.mockResolvedValue([
      buildDocument({ id: documentId, displayName: 'Umowa' }),
    ]);

    const result = await service.findAll(listingId, userId);

    expect(listingRepo.findOne).toHaveBeenCalledWith({
      where: { id: listingId, agentId: agent.id },
    });
    expect(documentRepo.find).toHaveBeenCalledWith({
      where: { listingId, agentId: agent.id },
      order: { createdAt: 'DESC' },
    });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      id: documentId,
      displayName: 'Umowa',
    });
    expect(result.checklist.summary.required).toBeGreaterThan(0);
  });

  it('does not expose whether a listing exists outside the agent scope', async () => {
    const { service, documentRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue(null);

    await expect(service.findAll(listingId, userId)).rejects.toThrow(
      NotFoundException,
    );
    expect(documentRepo.find).not.toHaveBeenCalled();
  });

  it('builds checklist summary from required documents', async () => {
    const { service, documentRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue(buildListing());
    documentRepo.find.mockResolvedValue([
      buildDocument({
        category: ListingDocumentCategory.AGENCY_AGREEMENT,
        status: ListingDocumentStatus.APPROVED,
      }),
      buildDocument({
        id: 'document-2',
        category: ListingDocumentCategory.LAND_AND_MORTGAGE_REGISTER,
        status: ListingDocumentStatus.NEEDS_CORRECTION,
      }),
    ]);

    const checklist = await service.getChecklist(listingId, userId);

    expect(checklist.summary).toMatchObject({
      required: 4,
      approved: 1,
      missing: 2,
      needsCorrection: 1,
      completionPct: 25,
    });
  });

  it('creates metadata-only document and logs an event', async () => {
    const { service, documentRepo, eventRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue({ id: listingId, agentId: agent.id });

    const result = await service.createMetadata(listingId, userId, {
      category: ListingDocumentCategory.AGENCY_AGREEMENT,
      displayName: ' Umowa pośrednictwa ',
      note: ' Do podpisu ',
    });

    expect(documentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: agent.id,
        listingId,
        category: ListingDocumentCategory.AGENCY_AGREEMENT,
        status: ListingDocumentStatus.REQUESTED,
        displayName: 'Umowa pośrednictwa',
        note: 'Do podpisu',
        uploadedByUserId: userId,
      }),
    );
    expect(eventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId,
        type: ListingDocumentEventType.METADATA_UPDATED,
      }),
    );
    expect(result.displayName).toBe('Umowa pośrednictwa');
  });

  it('marks approved document as reviewed by the current user', async () => {
    const { service, documentRepo, eventRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue({ id: listingId, agentId: agent.id });
    documentRepo.findOne.mockResolvedValue(
      buildDocument({ status: ListingDocumentStatus.IN_REVIEW }),
    );

    const result = await service.updateMetadata(listingId, documentId, userId, {
      status: ListingDocumentStatus.APPROVED,
    });

    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingDocumentStatus.APPROVED,
        reviewedByUserId: userId,
        reviewedAt: expect.any(Date),
      }),
    );
    expect(eventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ListingDocumentEventType.STATUS_CHANGED,
      }),
    );
    expect(result.status).toBe(ListingDocumentStatus.APPROVED);
  });

  it('soft deletes document and logs a deleted event', async () => {
    const { service, documentRepo, eventRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue({ id: listingId, agentId: agent.id });
    documentRepo.findOne.mockResolvedValue(buildDocument());

    await service.remove(listingId, documentId, userId);

    expect(documentRepo.softDelete).toHaveBeenCalledWith(documentId);
    expect(eventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId,
        type: ListingDocumentEventType.DELETED,
      }),
    );
  });

  it('builds attention summary for active listings without requesting deleted documents', async () => {
    const { service, documentRepo, listingRepo } = setup();
    const activeListing = buildListing({
      title: 'Aktywna oferta',
      status: ListingStatus.ACTIVE,
      updatedAt: now,
      createdAt: now,
    });
    listingRepo.find.mockResolvedValue([activeListing]);
    documentRepo.find.mockResolvedValue([
      buildDocument({
        id: 'document-needs-correction',
        status: ListingDocumentStatus.NEEDS_CORRECTION,
        displayName: 'Świadectwo energetyczne',
        category: ListingDocumentCategory.ENERGY_CERTIFICATE,
        updatedAt: now,
      }),
      buildDocument({
        id: 'document-overdue',
        status: ListingDocumentStatus.REQUESTED,
        displayName: 'Księga wieczysta',
        category: ListingDocumentCategory.LAND_AND_MORTGAGE_REGISTER,
        dueDate: new Date('2026-06-10T10:00:00.000Z'),
        updatedAt: now,
      }),
    ]);

    const result = await service.getAttentionSummaryForAgent(agent.id);

    expect(listingRepo.find).toHaveBeenCalledWith({
      where: { agentId: agent.id, status: ListingStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
    expect(documentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: agent.id,
        }),
        order: { updatedAt: 'DESC' },
      }),
    );
    expect(documentRepo.find.mock.calls[0]?.[0]).not.toHaveProperty(
      'withDeleted',
    );
    expect(result).toMatchObject({
      missingRequired: 2,
      needsCorrection: 1,
      overdue: 1,
      expired: 0,
      total: 4,
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'needs_correction',
          listingId,
          documentId: 'document-needs-correction',
        }),
        expect.objectContaining({
          kind: 'overdue',
          listingId,
          documentId: 'document-overdue',
        }),
        expect.objectContaining({
          kind: 'missing_required',
          listingId,
          documentId: null,
          count: 2,
        }),
      ]),
    );
  });
});

function buildDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: documentId,
    agentId: agent.id,
    listingId,
    category: ListingDocumentCategory.AGENCY_AGREEMENT,
    status: ListingDocumentStatus.REQUESTED,
    displayName: 'Umowa pośrednictwa',
    originalFilename: null,
    mimeType: null,
    fileSize: null,
    storageKey: null,
    checksum: null,
    note: null,
    dueDate: null,
    expiresAt: null,
    uploadedByUserId: userId,
    reviewedAt: null,
    reviewedByUserId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildListing(overrides: Record<string, unknown> = {}) {
  return {
    id: listingId,
    agentId: agent.id,
    title: 'Testowa oferta',
    status: ListingStatus.ACTIVE,
    transactionType: 'sale',
    propertyType: 'apartment',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
