import type { DealStatus } from './types';

/** Mirrors backend/src/deals/deal-status.ts's ALLOWED_TRANSITIONS — UI convenience only, server re-validates. */
export const ALLOWED_DEAL_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['SIGNED', 'CANCELLED'],
  SIGNED: ['PAID', 'CANCELLED'],
  PAID: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};
