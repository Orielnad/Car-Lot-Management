import { QuoteStatus } from '@prisma/client';

/**
 * Quote status flow (spec 7.1): נוצרה → נשלחה → נצפתה → אושרה/נדחתה/פגה.
 * Unlike a lead, a quote's journey really is linear — once sent it doesn't
 * go back to draft; a wrong quote gets superseded by a new one instead
 * (see QuotesService.revise()).
 */
const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: [QuoteStatus.SENT],
  SENT: [QuoteStatus.VIEWED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
  VIEWED: [QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
};

export class InvalidQuoteTransitionError extends Error {
  constructor(from: QuoteStatus, to: QuoteStatus) {
    super(`לא ניתן לשנות סטטוס הצעת מחיר מ-${from} ל-${to}.`);
    this.name = 'InvalidQuoteTransitionError';
  }
}

export function assertValidQuoteTransition(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    throw new InvalidQuoteTransitionError(currentStatus, nextStatus);
  }
}
