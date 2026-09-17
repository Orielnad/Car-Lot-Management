import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateBranchDto, actorId: string) {
    const branch = await this.prisma.branch.create({
      data: {
        organizationId,
        name: dto.name,
        address: dto.address,
      },
    });

    await this.auditLog.record({
      entityType: 'Branch',
      entityId: branch.id,
      actorId,
      action: 'CREATE',
      after: branch,
    });

    return branch;
  }
}
