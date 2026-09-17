import { TaskStatus } from '@prisma/client';
import { assertValidTaskTransition, TaskClosedError } from './task-status';

describe('assertValidTaskTransition', () => {
  it('allows OPEN -> DONE', () => {
    expect(() =>
      assertValidTaskTransition(TaskStatus.OPEN, TaskStatus.DONE),
    ).not.toThrow();
  });

  it('allows OPEN -> CANCELLED', () => {
    expect(() =>
      assertValidTaskTransition(TaskStatus.OPEN, TaskStatus.CANCELLED),
    ).not.toThrow();
  });

  it.each([TaskStatus.DONE, TaskStatus.CANCELLED])(
    'rejects any change once the task is closed (%s)',
    (closedStatus) => {
      expect(() =>
        assertValidTaskTransition(closedStatus, TaskStatus.OPEN),
      ).toThrow(TaskClosedError);
    },
  );

  it('treats "no change" as always allowed', () => {
    expect(() =>
      assertValidTaskTransition(TaskStatus.DONE, TaskStatus.DONE),
    ).not.toThrow();
  });
});
