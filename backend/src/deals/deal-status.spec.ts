import { DealStatus } from '@prisma/client';
import {
  assertValidDealTransition,
  DeliveryBlockedError,
  InvalidDealTransitionError,
} from './deal-status';

describe('assertValidDealTransition', () => {
  it('allows the normal linear flow', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.DRAFT,
        nextStatus: DealStatus.PENDING_APPROVAL,
        totalPaid: 0,
        salePrice: 100000,
      }),
    ).not.toThrow();
  });

  it('allows cancelling from any non-terminal state', () => {
    for (const status of [
      DealStatus.DRAFT,
      DealStatus.PENDING_APPROVAL,
      DealStatus.SIGNED,
      DealStatus.PAID,
      DealStatus.READY_FOR_DELIVERY,
    ]) {
      expect(() =>
        assertValidDealTransition({
          currentStatus: status,
          nextStatus: DealStatus.CANCELLED,
          totalPaid: 0,
          salePrice: 100000,
        }),
      ).not.toThrow();
    }
  });

  it('rejects skipping straight from DRAFT to SIGNED', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.DRAFT,
        nextStatus: DealStatus.SIGNED,
        totalPaid: 0,
        salePrice: 100000,
      }),
    ).toThrow(InvalidDealTransitionError);
  });

  it('blocks delivery when the deal is not fully paid', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.READY_FOR_DELIVERY,
        nextStatus: DealStatus.DELIVERED,
        totalPaid: 50000,
        salePrice: 100000,
      }),
    ).toThrow(DeliveryBlockedError);
  });

  it('allows delivery once fully paid', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.READY_FOR_DELIVERY,
        nextStatus: DealStatus.DELIVERED,
        totalPaid: 100000,
        salePrice: 100000,
      }),
    ).not.toThrow();
  });

  it('rejects any change once DELIVERED (final)', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.DELIVERED,
        nextStatus: DealStatus.CANCELLED,
        totalPaid: 100000,
        salePrice: 100000,
      }),
    ).toThrow(InvalidDealTransitionError);
  });

  it('rejects any change once CANCELLED (final)', () => {
    expect(() =>
      assertValidDealTransition({
        currentStatus: DealStatus.CANCELLED,
        nextStatus: DealStatus.DRAFT,
        totalPaid: 0,
        salePrice: 100000,
      }),
    ).toThrow(InvalidDealTransitionError);
  });
});
