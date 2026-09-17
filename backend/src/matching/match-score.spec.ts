import { computeMatchScore, LeadPreferences, VehicleForMatching } from './match-score';

const perfectVehicle: VehicleForMatching = {
  manufacturer: 'Toyota',
  model: 'Corolla',
  year: 2022,
  mileageKm: 20000,
  listPrice: 100000,
  bodyType: 'Sedan',
  gearbox: 'Automatic',
  fuelType: 'Petrol',
  color: 'White',
};

describe('computeMatchScore', () => {
  it('scores 100 when every stated preference matches exactly', () => {
    const prefs: LeadPreferences = {
      budgetMin: 90000,
      budgetMax: 110000,
      manufacturer: 'Toyota',
      model: 'Corolla',
      yearMin: 2020,
      mileageMax: 30000,
      bodyType: 'Sedan',
      gearbox: 'Automatic',
      fuelType: 'Petrol',
      color: 'White',
    };

    const result = computeMatchScore(prefs, perfectVehicle);

    expect(result.score).toBe(100);
    expect(result.explanation.every((c) => c.matched)).toBe(true);
  });

  it('scores 100 when the lead has no stated preferences at all', () => {
    const result = computeMatchScore({}, perfectVehicle);
    expect(result.score).toBe(100);
  });

  it('gives zero credit for manufacturer when it does not match', () => {
    const result = computeMatchScore({ manufacturer: 'Mazda' }, perfectVehicle);
    const makeModel = result.explanation.find((c) => c.label === 'יצרן ודגם')!;
    expect(makeModel.earned).toBe(0);
    expect(makeModel.matched).toBe(false);
  });

  it('gives half credit when manufacturer matches but model does not', () => {
    const result = computeMatchScore(
      { manufacturer: 'Toyota', model: 'Camry' },
      perfectVehicle,
    );
    const makeModel = result.explanation.find((c) => c.label === 'יצרן ודגם')!;
    expect(makeModel.earned).toBe(13); // round(25/2)
  });

  it('reduces the budget score gradually when the vehicle is over budget, floors at zero', () => {
    const overBudget = computeMatchScore({ budgetMax: 100000 }, {
      ...perfectVehicle,
      listPrice: 110000, // 10% over
    });
    const budget10pct = overBudget.explanation.find((c) => c.label === 'תקציב')!;
    expect(budget10pct.earned).toBe(20); // round(25 * (1 - 0.1*2))

    const wayOverBudget = computeMatchScore({ budgetMax: 100000 }, {
      ...perfectVehicle,
      listPrice: 200000, // 100% over
    });
    const budgetWayOver = wayOverBudget.explanation.find((c) => c.label === 'תקציב')!;
    expect(budgetWayOver.earned).toBe(0);
  });

  it('treats a vehicle with no list price as failing a stated budget preference', () => {
    const result = computeMatchScore(
      { budgetMax: 100000 },
      { ...perfectVehicle, listPrice: null },
    );
    const budget = result.explanation.find((c) => c.label === 'תקציב')!;
    expect(budget.earned).toBe(0);
    expect(budget.note).toContain('אין מחיר');
  });

  it('rejects a vehicle older than the requested minimum year', () => {
    const result = computeMatchScore({ yearMin: 2023 }, perfectVehicle);
    const year = result.explanation.find((c) => c.label === 'שנתון')!;
    expect(year.earned).toBe(0);
  });

  it('never returns a negative or over-100 score', () => {
    const result = computeMatchScore(
      {
        budgetMax: 1000,
        manufacturer: 'Mazda',
        yearMin: 2030,
        mileageMax: 1,
        bodyType: 'SUV',
        gearbox: 'Manual',
        fuelType: 'Diesel',
        color: 'Black',
      },
      perfectVehicle,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
