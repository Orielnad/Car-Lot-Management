import { QuoteStatus } from '@prisma/client';
import { assertValidQuoteTransition, InvalidQuoteTransitionError } from './quote-status';

describe('assertValidQuoteTransition', () => {
  it('allows the normal linear flow', () => {
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.DRAFT, QuoteStatus.SENT),
    ).not.toThrow();
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.SENT, QuoteStatus.VIEWED),
    ).not.toThrow();
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.VIEWED, QuoteStatus.APPROVED),
    ).not.toThrow();
  });

  it('rejects going back to DRAFT once sent', () => {
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.SENT, QuoteStatus.DRAFT),
    ).toThrow(InvalidQuoteTransitionError);
  });

  it('rejects skipping straight from DRAFT to APPROVED', () => {
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.DRAFT, QuoteStatus.APPROVED),
    ).toThrow(InvalidQuoteTransitionError);
  });

  it.each([QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED])(
    'rejects any change once the quote is closed (%s)',
    (closedStatus) => {
      expect(() =>
        assertValidQuoteTransition(closedStatus, QuoteStatus.SENT),
      ).toThrow(InvalidQuoteTransitionError);
    },
  );

  it('allows expiring a sent quote directly, without it being viewed', () => {
    expect(() =>
      assertValidQuoteTransition(QuoteStatus.SENT, QuoteStatus.EXPIRED),
    ).not.toThrow();
  });
});
