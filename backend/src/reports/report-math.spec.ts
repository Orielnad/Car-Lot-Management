import { averageAgeDays, conversionRate, toNumberOrZero } from './report-math';

describe('averageAgeDays', () => {
  it('returns 0 for an empty list', () => {
    expect(averageAgeDays([])).toBe(0);
  });

  it('computes the average age in days across several dates', () => {
    const now = new Date('2026-01-11T00:00:00Z');
    const dates = [
      new Date('2026-01-01T00:00:00Z'), // 10 days
      new Date('2026-01-06T00:00:00Z'), // 5 days
    ];
    expect(averageAgeDays(dates, now)).toBe(7.5);
  });
});

describe('conversionRate', () => {
  it('returns 0 when nothing has been decided yet', () => {
    expect(conversionRate(0, 0)).toBe(0);
  });

  it('computes a percentage rounded to one decimal', () => {
    expect(conversionRate(3, 7)).toBe(30);
    expect(conversionRate(1, 2)).toBe(33.3);
  });

  it('returns 100 when nothing was lost', () => {
    expect(conversionRate(5, 0)).toBe(100);
  });
});

describe('toNumberOrZero', () => {
  it('converts null/undefined to 0', () => {
    expect(toNumberOrZero(null)).toBe(0);
    expect(toNumberOrZero(undefined)).toBe(0);
  });

  it('converts a Decimal-like value to a number', () => {
    expect(toNumberOrZero('105000.50' as unknown)).toBe(105000.5);
  });
});
