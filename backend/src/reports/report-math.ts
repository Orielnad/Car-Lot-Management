/**
 * Pure helpers for the reports below (spec section 12: "אין להציג מספר ללא
 * אפשרות להבין ממה הורכב" — every number here comes from a documented,
 * testable formula, not an inline calculation buried in a query).
 */

export function averageAgeDays(createdAtDates: Date[], now: Date = new Date()): number {
  if (createdAtDates.length === 0) {
    return 0;
  }
  const totalDays = createdAtDates.reduce((sum, createdAt) => {
    const diffMs = now.getTime() - createdAt.getTime();
    return sum + diffMs / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round((totalDays / createdAtDates.length) * 10) / 10;
}

export function conversionRate(won: number, lost: number): number {
  const decided = won + lost;
  if (decided === 0) {
    return 0;
  }
  return Math.round((won / decided) * 1000) / 10; // one decimal, as a percentage
}

export function toNumberOrZero(value: unknown): number {
  return value == null ? 0 : Number(value);
}
