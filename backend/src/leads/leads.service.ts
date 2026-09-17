import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import {
  assertValidLeadTransition,
  LeadClosedError,
  MissingLossReasonError,
} from './lead-status';

const CAN_SEE_ALL_LEADS: RoleName[] = [RoleName.OWNER, RoleName.SALES_MANAGER];

export interface LeadActor {
  userId: string;
  roles: RoleName[];
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(actor: LeadActor) {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_LEADS.includes(role));
    return this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...(canSeeAll ? {} : { ownerUserId: actor.userId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: LeadActor) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException('הליד לא נמצא.');
    }
    this.assertCanAccess(lead.ownerUserId, actor);
    return lead;
  }

  async create(dto: CreateLeadDto, actor: LeadActor) {
    const canAssignToOthers = actor.roles.some((role) =>
      CAN_SEE_ALL_LEADS.includes(role),
    );

    if (dto.ownerUserId && dto.ownerUserId !== actor.userId && !canAssignToOthers) {
      throw new ForbiddenException(
        'אין לך הרשאה להקצות ליד למישהו אחר — רק מנהל מכירות או בעלים יכולים.',
      );
    }

    const lead = await this.prisma.lead.create({
      data: {
        customerId: dto.customerId,
        source: dto.source,
        ownerUserId: dto.ownerUserId ?? actor.userId,
        preferences: dto.preferences as Prisma.InputJsonValue | undefined,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : undefined,
      },
    });

    await this.auditLog.record({
      entityType: 'Lead',
      entityId: lead.id,
      actorId: actor.userId,
      action: 'CREATE',
      after: lead,
    });

    return lead;
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, actor: LeadActor) {
    const lead = await this.findOne(id, actor);

    this.checkTransitionOrThrowHttp(
      lead.status,
      dto.status,
      Boolean(dto.lossReason),
    );

    const { count } = await this.prisma.lead.updateMany({
      where: { id, version: dto.version, deletedAt: null },
      data: {
        status: dto.status,
        lossReason: dto.status === 'LOST' ? dto.lossReason : lead.lossReason,
        version: { increment: 1 },
      },
    });

    if (count === 0) {
      throw new ConflictException(
        'מישהו אחר עדכן את הליד הזה בינתיים. יש לרענן ולנסות שוב.',
      );
    }

    const updated = await this.prisma.lead.findFirst({ where: { id } });

    await this.auditLog.record({
      entityType: 'Lead',
      entityId: id,
      actorId: actor.userId,
      action: 'STATUS_CHANGE',
      before: { status: lead.status },
      after: { status: dto.status },
    });

    return updated;
  }

  private assertCanAccess(ownerUserId: string, actor: LeadActor): void {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_LEADS.includes(role));
    if (!canSeeAll && ownerUserId !== actor.userId) {
      throw new ForbiddenException('הליד הזה שייך לעובד אחר.');
    }
  }

  private checkTransitionOrThrowHttp(
    currentStatus: Parameters<typeof assertValidLeadTransition>[0]['currentStatus'],
    nextStatus: Parameters<typeof assertValidLeadTransition>[0]['nextStatus'],
    hasLossReason: boolean,
  ): void {
    try {
      assertValidLeadTransition({ currentStatus, nextStatus, hasLossReason });
    } catch (error) {
      if (error instanceof LeadClosedError || error instanceof MissingLossReasonError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
