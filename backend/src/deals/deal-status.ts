import { DealStatus } from '@prisma/client';

/**
 * Deal status flow (spec 7.2): טיוטה → ממתינה לאישור → חתומה → בתשלום →
 * מוכנה למסירה → נמסרה. CANCELLED is reachable from any non-terminal state
 * (spec 7.5: ביטול עסקה) but never from DELIVERED — a delivered car isn't
 * un-delivered by changing a status field.
 */
const ALLOWED_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  DRAFT: [DealStatus.PENDING_APPROVAL, DealStatus.CANCELLED],
  PENDING_APPROVAL: [DealStatus.SIGNED, DealStatus.CANCELLED],
  SIGNED: [DealStatus.PAID, DealStatus.CANCELLED],
  PAID: [DealStatus.READY_FOR_DELIVERY, DealStatus.CANCELLED],
  READY_FOR_DELIVERY: [DealStatus.DELIVERED, DealStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export class InvalidDealTransitionError extends Error {
  constructor(from: DealStatus, to: DealStatus) {
    super(`לא ניתן לשנות סטטוס עסקה מ-${from} ל-${to}.`);
    this.name = 'InvalidDealTransitionError';
  }
}

export class DeliveryBlockedError extends Error {
  constructor(reason: string) {
    super(`מסירה חסומה: ${reason}`);
    this.name = 'DeliveryBlockedError';
  }
}

export interface DealTransitionCheckInput {
  currentStatus: DealStatus;
  nextStatus: DealStatus;
  totalPaid: number;
  salePrice: number;
}

/**
 * Enforces both the allowed state graph and spec 20's rule: "מסירה חסומה
 * כאשר חסרים תשלום ... אלא אם בעל הרשאה מאשר חריגה מנומקת" — the override
 * path isn't built yet (no field to record a reasoned exception), so for
 * now delivery is simply blocked until paid in full.
 */
export function assertValidDealTransition({
  currentStatus,
  nextStatus,
  totalPaid,
  salePrice,
}: DealTransitionCheckInput): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    throw new InvalidDealTransitionError(currentStatus, nextStatus);
  }

  if (nextStatus === DealStatus.DELIVERED && totalPaid < salePrice) {
    throw new DeliveryBlockedError(
      `נדרש תשלום מלא (${salePrice}) לפני מסירה, שולם עד כה ${totalPaid}.`,
    );
  }
}
