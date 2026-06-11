import { NotFoundException } from '@nestjs/common';
import {
  ListingDocumentCategory,
  ListingDocumentEventType,
  ListingDocumentStatus,
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
    listingRepo.findOne.mockResolvedValue({ id: listingId, agentId: agent.id });
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
  });

  it('does not expose whether a listing exists outside the agent scope', async () => {
    const { service, documentRepo, listingRepo } = setup();
    listingRepo.findOne.mockResolvedValue(null);

    await expect(service.findAll(listingId, userId)).rejects.toThrow(
      NotFoundException,
    );
    expect(documentRepo.find).not.toHaveBeenCalled();
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
