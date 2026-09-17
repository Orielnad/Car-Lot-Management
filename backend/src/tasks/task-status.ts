import { TaskStatus } from '@prisma/client';

const TERMINAL_STATUSES: TaskStatus[] = [TaskStatus.DONE, TaskStatus.CANCELLED];

export class TaskClosedError extends Error {
  constructor(status: TaskStatus) {
    super(`המשימה כבר סגורה (${status}) ולא ניתן לשנות את הסטטוס שלה.`);
    this.name = 'TaskClosedError';
  }
}

export function assertValidTaskTransition(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }
  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new TaskClosedError(currentStatus);
  }
}
