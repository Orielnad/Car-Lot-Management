import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntryInput {
  entityType: string;
  entityId: string;
  actorId: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Single place that writes to AuditLog. Sensitive actions (create/update/
 * delete/approve on Vehicle, Customer, Deal, Payment, permissions, etc.)
 * must go through this service — never write directly, so nothing is
 * "forgotten" (see docs/api-conventions.md).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntryInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        action: entry.action,
        before: entry.before === undefined ? undefined : (entry.before as object),
        after: entry.after === undefined ? undefined : (entry.after as object),
      },
    });
  }
}
