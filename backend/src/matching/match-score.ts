/**
 * Lead-to-vehicle match scoring (spec section 6 / docs/data-model.md).
 * Pure, framework-free function — the only place this business logic lives,
 * so it can be unit-tested without a database and reused for the reverse
 * direction (which leads fit a given vehicle) with the same code.
 *
 * Design choice: when the lead states no preference for a criterion, that
 * criterion is scored as fully satisfied (a stated requirement can hurt the
 * score; an absent one never does) — matches spec 6's "העדפות ישפיעו על
 * הציון" (preferences affect the score, not the absence of one).
 *
 * Weights (sum to 100): budget 25, manufacturer/model 25, year 10 +
 * mileage 10, body type 15, gearbox 5 + fuel 5, color 5. This simplifies the
 * spec's table by dropping the "equipment/safety" criterion, which needs a
 * features list the MVP data model doesn't have yet.
 */

export interface LeadPreferences {
  budgetMin?: number;
  budgetMax?: number;
  manufacturer?: string;
  model?: string;
  yearMin?: number;
  mileageMax?: number;
  bodyType?: string;
  gearbox?: string;
  fuelType?: string;
  color?: string;
}

export interface VehicleForMatching {
  manufacturer: string;
  model: string;
  year: number;
  mileageKm: number | null;
  listPrice: number | null;
  bodyType: string | null;
  gearbox: string | null;
  fuelType: string | null;
  color: string | null;
}

export interface MatchCriterion {
  label: string;
  weight: number;
  earned: number;
  matched: boolean;
  note: string;
}

export interface MatchResult {
  score: number;
  explanation: MatchCriterion[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function proportionalFalloff(weight: number, excessRatio: number): number {
  return Math.max(0, Math.round(weight * (1 - excessRatio * 2)));
}

function scoreBudget(prefs: LeadPreferences, vehicle: VehicleForMatching): MatchCriterion {
  const weight = 25;
  const label = 'תקציב';

  if (prefs.budgetMin == null && prefs.budgetMax == null) {
    return { label, weight, earned: weight, matched: true, note: 'אין העדפת תקציב' };
  }
  if (vehicle.listPrice == null) {
    return { label, weight, earned: 0, matched: false, note: 'אין מחיר פרסום לרכב' };
  }

  const price = vehicle.listPrice;
  const aboveMax = prefs.budgetMax != null && price > prefs.budgetMax;
  const belowMin = prefs.budgetMin != null && price < prefs.budgetMin;

  if (!aboveMax && !belowMin) {
    return { label, weight, earned: weight, matched: true, note: 'בתוך התקציב' };
  }

  const excessRatio = aboveMax
    ? (price - prefs.budgetMax!) / prefs.budgetMax!
    : (prefs.budgetMin! - price) / prefs.budgetMin!;

  return {
    label,
    weight,
    earned: proportionalFalloff(weight, excessRatio),
    matched: false,
    note: aboveMax ? 'מחיר גבוה מהתקציב' : 'מחיר נמוך מהתקציב המבוקש',
  };
}

function scoreManufacturerModel(
  prefs: LeadPreferences,
  vehicle: VehicleForMatching,
): MatchCriterion {
  const weight = 25;
  const label = 'יצרן ודגם';

  if (!prefs.manufacturer) {
    return { label, weight, earned: weight, matched: true, note: 'אין העדפת יצרן' };
  }
  if (normalize(prefs.manufacturer) !== normalize(vehicle.manufacturer)) {
    return { label, weight, earned: 0, matched: false, note: 'יצרן לא תואם' };
  }
  if (!prefs.model || normalize(prefs.model) === normalize(vehicle.model)) {
    return { label, weight, earned: weight, matched: true, note: 'יצרן ודגם תואמים' };
  }
  return {
    label,
    weight,
    earned: Math.round(weight / 2),
    matched: false,
    note: 'יצרן תואם, דגם שונה',
  };
}

function scoreYear(prefs: LeadPreferences, vehicle: VehicleForMatching): MatchCriterion {
  const weight = 10;
  const label = 'שנתון';

  if (prefs.yearMin == null) {
    return { label, weight, earned: weight, matched: true, note: 'אין העדפת שנתון' };
  }
  if (vehicle.year >= prefs.yearMin) {
    return { label, weight, earned: weight, matched: true, note: 'שנתון עומד בדרישה' };
  }
  return { label, weight, earned: 0, matched: false, note: 'שנתון ישן מהמבוקש' };
}

function scoreMileage(prefs: LeadPreferences, vehicle: VehicleForMatching): MatchCriterion {
  const weight = 10;
  const label = 'קילומטראז׳';

  if (prefs.mileageMax == null) {
    return { label, weight, earned: weight, matched: true, note: 'אין העדפת קילומטראז׳' };
  }
  if (vehicle.mileageKm == null) {
    return { label, weight, earned: 0, matched: false, note: 'אין נתון קילומטראז׳ לרכב' };
  }
  if (vehicle.mileageKm <= prefs.mileageMax) {
    return { label, weight, earned: weight, matched: true, note: 'קילומטראז׳ עומד בדרישה' };
  }
  const excessRatio = (vehicle.mileageKm - prefs.mileageMax) / prefs.mileageMax;
  return {
    label,
    weight,
    earned: proportionalFalloff(weight, excessRatio),
    matched: false,
    note: 'קילומטראז׳ גבוה מהמבוקש',
  };
}

function scoreExactTextField(
  label: string,
  weight: number,
  preferred: string | undefined,
  actual: string | null,
): MatchCriterion {
  if (!preferred) {
    return { label, weight, earned: weight, matched: true, note: `אין העדפת ${label}` };
  }
  if (actual == null) {
    return { label, weight, earned: 0, matched: false, note: `אין נתון ${label} לרכב` };
  }
  if (normalize(preferred) === normalize(actual)) {
    return { label, weight, earned: weight, matched: true, note: `${label} תואם` };
  }
  return { label, weight, earned: 0, matched: false, note: `${label} לא תואם` };
}

export function computeMatchScore(
  prefs: LeadPreferences,
  vehicle: VehicleForMatching,
): MatchResult {
  const explanation: MatchCriterion[] = [
    scoreBudget(prefs, vehicle),
    scoreManufacturerModel(prefs, vehicle),
    scoreYear(prefs, vehicle),
    scoreMileage(prefs, vehicle),
    scoreExactTextField('סוג מרכב', 15, prefs.bodyType, vehicle.bodyType),
    scoreExactTextField('גיר', 5, prefs.gearbox, vehicle.gearbox),
    scoreExactTextField('סוג דלק', 5, prefs.fuelType, vehicle.fuelType),
    scoreExactTextField('צבע', 5, prefs.color, vehicle.color),
  ];

  const score = explanation.reduce((sum, criterion) => sum + criterion.earned, 0);

  return { score: Math.min(100, Math.max(0, score)), explanation };
}
