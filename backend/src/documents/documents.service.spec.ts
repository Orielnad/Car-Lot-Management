import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let prisma: {
    document: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
  };
  let leadsService: { findOne: jest.Mock };
  let dealsService: { findOne: jest.Mock };
  let fileStorage: { save: jest.Mock; read: jest.Mock };
  let auditLog: { record: jest.Mock };
  let service: DocumentsService;

  const actor = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };

  const pdfFile = {
    originalname: 'contract.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    buffer: Buffer.from('fake-pdf-content'),
  };

  beforeEach(() => {
    prisma = {
      document: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    };
    leadsService = { findOne: jest.fn().mockResolvedValue({}) };
    dealsService = { findOne: jest.fn().mockResolvedValue({}) };
    fileStorage = {
      save: jest.fn().mockResolvedValue('random-uuid.pdf'),
      read: jest.fn().mockResolvedValue(Buffer.from('content')),
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    service = new DocumentsService(
      prisma as any,
      leadsService as any,
      dealsService as any,
      fileStorage as any,
      auditLog as any,
    );
  });

  it('enforces the linked lead\'s row-level access before uploading', async () => {
    leadsService.findOne.mockRejectedValue(new ForbiddenException('no access'));

    await expect(
      service.upload(
        { entityType: 'Lead', entityId: 'lead-1', docType: 'CONTRACT' as any },
        pdfFile,
        actor,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it('enforces the linked deal\'s row-level access before uploading', async () => {
    dealsService.findOne.mockRejectedValue(new ForbiddenException('no access'));

    await expect(
      service.upload(
        { entityType: 'Deal', entityId: 'deal-1', docType: 'CONTRACT' as any },
        pdfFile,
        actor,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it('allows Vehicle/Customer documents without an owner-based check', async () => {
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });

    await service.upload(
      { entityType: 'Vehicle', entityId: 'vehicle-1', docType: 'INSPECTION' as any },
      pdfFile,
      actor,
    );

    expect(fileStorage.save).toHaveBeenCalled();
  });

  it('rejects an invalid file (e.g. wrong type) before saving anything to disk', async () => {
    await expect(
      service.upload(
        { entityType: 'Vehicle', entityId: 'vehicle-1', docType: 'OTHER' as any },
        { ...pdfFile, originalname: 'virus.exe', mimetype: 'application/x-msdownload' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('revise() creates a new row linked via supersedesId, never mutating the original', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      entityType: 'Vehicle',
      entityId: 'vehicle-1',
      docType: 'INSPECTION',
      version: 1,
    });
    prisma.document.create.mockResolvedValue({ id: 'doc-2', supersedesId: 'doc-1', version: 2 });

    const result = await service.revise('doc-1', pdfFile, actor);

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supersedesId: 'doc-1', version: 2 }),
      }),
    );
    expect(result.supersedesId).toBe('doc-1');
  });
});
