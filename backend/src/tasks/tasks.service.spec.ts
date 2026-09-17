import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RoleName, TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let prisma: {
    task: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let auditLog: { record: jest.Mock };
  let service: TasksService;

  const salesperson = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };
  const manager = { userId: 'manager-1', roles: [RoleName.SALES_MANAGER] };

  const taskOwnedBySales1 = {
    id: 'task-1',
    entityType: 'Lead',
    entityId: 'lead-1',
    ownerUserId: 'sales-1',
    type: TaskType.CALL,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.OPEN,
    version: 1,
  };

  beforeEach(() => {
    prisma = {
      task: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TasksService(prisma as any, auditLog as any);
  });

  it("blocks a salesperson from reading a colleague's task", async () => {
    prisma.task.findFirst.mockResolvedValue({
      ...taskOwnedBySales1,
      ownerUserId: 'sales-2',
    });

    await expect(service.findOne('task-1', salesperson)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('scopes findAll to own tasks for a salesperson but not for a manager', async () => {
    prisma.task.findMany.mockResolvedValue([]);

    await service.findAll(salesperson);
    expect(prisma.task.findMany.mock.calls[0][0].where.ownerUserId).toBe(
      'sales-1',
    );

    await service.findAll(manager);
    expect(prisma.task.findMany.mock.calls[1][0].where.ownerUserId).toBeUndefined();
  });

  it('refuses a salesperson assigning a task to someone else', async () => {
    await expect(
      service.create(
        {
          entityType: 'Lead',
          entityId: 'lead-1',
          type: TaskType.CALL,
          ownerUserId: 'sales-2',
        },
        salesperson,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('lets a manager assign a task to a specific salesperson', async () => {
    prisma.task.create.mockResolvedValue({ id: 'new-task' });

    await service.create(
      {
        entityType: 'Lead',
        entityId: 'lead-1',
        type: TaskType.CALL,
        ownerUserId: 'sales-2',
      },
      manager,
    );

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerUserId: 'sales-2' }),
      }),
    );
  });

  it('rejects reopening a closed task', async () => {
    prisma.task.findFirst.mockResolvedValue({
      ...taskOwnedBySales1,
      status: TaskStatus.DONE,
    });

    await expect(
      service.updateStatus(
        'task-1',
        { status: TaskStatus.OPEN, version: 1 },
        salesperson,
      ),
    ).rejects.toThrow('כבר סגורה');
    expect(prisma.task.updateMany).not.toHaveBeenCalled();
  });

  it('raises a conflict on a stale version', async () => {
    prisma.task.findFirst.mockResolvedValue(taskOwnedBySales1);
    prisma.task.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus(
        'task-1',
        { status: TaskStatus.DONE, version: 1 },
        salesperson,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
