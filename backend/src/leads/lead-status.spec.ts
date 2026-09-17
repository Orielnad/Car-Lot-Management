import { LeadStatus } from '@prisma/client';
import {
  assertValidLeadTransition,
  LeadClosedError,
  MissingLossReasonError,
} from './lead-status';

describe('assertValidLeadTransition', () => {
  it('allows moving freely between active statuses', () => {
    expect(() =>
      assertValidLeadTransition({
        currentStatus: LeadStatus.NEW,
        nextStatus: LeadStatus.OFFER,
        hasLossReason: false,
      }),
    ).not.toThrow();
  });

  it('allows moving backward between active statuses (a reopened deal)', () => {
    expect(() =>
      assertValidLeadTransition({
        currentStatus: LeadStatus.NEGOTIATION,
        nextStatus: LeadStatus.QUALIFIED,
        hasLossReason: false,
      }),
    ).not.toThrow();
  });

  it('requires a loss reason before marking a lead LOST', () => {
    expect(() =>
      assertValidLeadTransition({
        currentStatus: LeadStatus.NEGOTIATION,
        nextStatus: LeadStatus.LOST,
        hasLossReason: false,
      }),
    ).toThrow(MissingLossReasonError);
  });

  it('allows marking LOST once a reason is provided', () => {
    expect(() =>
      assertValidLeadTransition({
        currentStatus: LeadStatus.NEGOTIATION,
        nextStatus: LeadStatus.LOST,
        hasLossReason: true,
      }),
    ).not.toThrow();
  });

  it.each([LeadStatus.WON, LeadStatus.LOST, LeadStatus.NOT_RELEVANT])(
    'rejects any change once the lead is closed (%s)',
    (closedStatus) => {
      expect(() =>
        assertValidLeadTransition({
          currentStatus: closedStatus,
          nextStatus: LeadStatus.CONTACTED,
          hasLossReason: false,
        }),
      ).toThrow(LeadClosedError);
    },
  );

  it('allows a lead sitting in FUTURE_NURTURE to be reactivated', () => {
    expect(() =>
      assertValidLeadTransition({
        currentStatus: LeadStatus.FUTURE_NURTURE,
        nextStatus: LeadStatus.CONTACTED,
        hasLossReason: false,
      }),
    ).not.toThrow();
  });
});
