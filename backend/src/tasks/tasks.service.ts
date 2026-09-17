import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { assertValidTaskTransition, TaskClosedError } from './task-status';

const CAN_SEE_ALL_TASKS: RoleName[] = [RoleName.OWNER, RoleName.SALES_MANAGER];

export interface TaskActor {
  userId: string;
  roles: RoleName[];
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** "המשימות שלי להיום" — every user's own personal work list. */
  async findMine(actor: TaskActor) {
    return this.prisma.task.findMany({
      where: { deletedAt: null, ownerUserId: actor.userId },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAll(actor: TaskActor) {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_TASKS.includes(role));
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(canSeeAll ? {} : { ownerUserId: actor.userId }),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, actor: TaskActor) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException('המשימה לא נמצאה.');
    }
    this.assertCanAccess(task.ownerUserId, actor);
    return task;
  }

  async create(dto: CreateTaskDto, actor: TaskActor) {
    const canAssignToOthers = actor.roles.some((role) =>
      CAN_SEE_ALL_TASKS.includes(role),
    );

    if (dto.ownerUserId && dto.ownerUserId !== actor.userId && !canAssignToOthers) {
      throw new ForbiddenException(
        'אין לך הרשאה להקצות משימה למישהו אחר — רק מנהל מכירות או בעלים יכולים.',
      );
    }

    const task = await this.prisma.task.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        ownerUserId: dto.ownerUserId ?? actor.userId,
        type: dto.type,
        priority: dto.priority,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        notes: dto.notes,
      },
    });

    await this.auditLog.record({
      entityType: 'Task',
      entityId: task.id,
      actorId: actor.userId,
      action: 'CREATE',
      after: task,
    });

    return task;
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, actor: TaskActor) {
    const task = await this.findOne(id, actor);

    try {
      assertValidTaskTransition(task.status, dto.status);
    } catch (error) {
      if (error instanceof TaskClosedError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const { count } = await this.prisma.task.updateMany({
      where: { id, version: dto.version, deletedAt: null },
      data: { status: dto.status, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ConflictException(
        'מישהו אחר עדכן את המשימה הזו בינתיים. יש לרענן ולנסות שוב.',
      );
    }

    const updated = await this.prisma.task.findFirst({ where: { id } });

    await this.auditLog.record({
      entityType: 'Task',
      entityId: id,
      actorId: actor.userId,
      action: 'STATUS_CHANGE',
      before: { status: task.status },
      after: { status: dto.status },
    });

    return updated;
  }

  private assertCanAccess(ownerUserId: string, actor: TaskActor): void {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_TASKS.includes(role));
    if (!canSeeAll && ownerUserId !== actor.userId) {
      throw new ForbiddenException('המשימה הזו שייכת לעובד אחר.');
    }
  }
}
