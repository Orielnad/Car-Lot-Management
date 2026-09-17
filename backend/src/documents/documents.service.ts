import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LeadActor, LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { FileStorageService } from './file-storage.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { assertValidUpload, FileValidationError } from './file-validation';
import { TaskEntityType } from '../tasks/dto/create-task.dto';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly dealsService: DealsService,
    private readonly fileStorage: FileStorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllForEntity(
    entityType: TaskEntityType,
    entityId: string,
    actor: LeadActor,
  ) {
    await this.assertCanAccessEntity(entityType, entityId, actor);
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: LeadActor) {
    const document = await this.prisma.document.findFirst({ where: { id } });
    if (!document) {
      throw new NotFoundException('המסמך לא נמצא.');
    }
    await this.assertCanAccessEntity(
      document.entityType as TaskEntityType,
      document.entityId,
      actor,
    );
    return document;
  }

  async upload(dto: UploadDocumentDto, file: UploadedFileLike, actor: LeadActor) {
    await this.assertCanAccessEntity(dto.entityType, dto.entityId, actor);
    this.validateOrThrowHttp(file);

    const storedFileName = await this.fileStorage.save(file.buffer, file.originalname);

    const document = await this.prisma.document.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        docType: dto.docType,
        originalFileName: file.originalname,
        storedFileName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: actor.userId,
      },
    });

    await this.auditLog.record({
      entityType: 'Document',
      entityId: document.id,
      actorId: actor.userId,
      action: 'CREATE',
      after: { ...document, storedFileName: undefined },
    });

    return document;
  }

  /** Creates a new version — never overwrites the previous file or row. */
  async revise(id: string, file: UploadedFileLike, actor: LeadActor) {
    const previous = await this.findOne(id, actor);
    this.validateOrThrowHttp(file);

    const storedFileName = await this.fileStorage.save(file.buffer, file.originalname);

    const revised = await this.prisma.document.create({
      data: {
        entityType: previous.entityType,
        entityId: previous.entityId,
        docType: previous.docType,
        originalFileName: file.originalname,
        storedFileName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: actor.userId,
        version: previous.version + 1,
        supersedesId: previous.id,
      },
    });

    await this.auditLog.record({
      entityType: 'Document',
      entityId: revised.id,
      actorId: actor.userId,
      action: 'REVISE',
      before: { supersedes: previous.id },
      after: { ...revised, storedFileName: undefined },
    });

    return revised;
  }

  async download(id: string, actor: LeadActor) {
    const document = await this.findOne(id, actor);
    const buffer = await this.fileStorage.read(document.storedFileName);
    return { document, buffer };
  }

  private validateOrThrowHttp(file: UploadedFileLike): void {
    try {
      assertValidUpload({
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    } catch (error) {
      if (error instanceof FileValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Row-level access follows the linked entity's own rules: a Lead's
   * documents are only visible to its owner (or management), same for a
   * Deal. Customer/Vehicle documents aren't owned by one person, so any
   * authenticated user can reach them (consistent with those modules'
   * own controllers today).
   */
  private async assertCanAccessEntity(
    entityType: TaskEntityType,
    entityId: string,
    actor: LeadActor,
  ): Promise<void> {
    if (entityType === 'Lead') {
      await this.leadsService.findOne(entityId, actor);
      return;
    }
    if (entityType === 'Deal') {
      await this.dealsService.findOne(entityId, actor);
      return;
    }
    // Customer / Vehicle: no per-owner restriction in this MVP.
  }
}
