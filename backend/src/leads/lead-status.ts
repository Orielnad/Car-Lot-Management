import { LeadStatus } from '@prisma/client';

/**
 * Unlike vehicles (docs/architecture.md), a lead's journey isn't a strict
 * pipeline — a salesperson can jump stages or move backward when a deal
 * reopens. What must be enforced: once a lead is decided (won, lost, or
 * marked not relevant) it stays decided, and a "lost" always needs a reason
 * (see docs/data-model.md, section 5.3 of the spec).
 */
const TERMINAL_STATUSES: LeadStatus[] = [
  LeadStatus.WON,
  LeadStatus.LOST,
  LeadStatus.NOT_RELEVANT,
];

export class LeadClosedError extends Error {
  constructor(status: LeadStatus) {
    super(`הליד כבר סגור (${status}) ולא ניתן לשנות את הסטטוס שלו.`);
    this.name = 'LeadClosedError';
  }
}

export class MissingLossReasonError extends Error {
  constructor() {
    super('יש להזין סיבת הפסד לפני סימון הליד כ"הפסד".');
    this.name = 'MissingLossReasonError';
  }
}

export interface LeadTransitionCheckInput {
  currentStatus: LeadStatus;
  nextStatus: LeadStatus;
  hasLossReason: boolean;
}

export function assertValidLeadTransition({
  currentStatus,
  nextStatus,
  hasLossReason,
}: LeadTransitionCheckInput): void {
  if (currentStatus === nextStatus) {
    return;
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    throw new LeadClosedError(currentStatus);
  }

  if (nextStatus === LeadStatus.LOST && !hasLossReason) {
    throw new MissingLossReasonError();
  }
}
