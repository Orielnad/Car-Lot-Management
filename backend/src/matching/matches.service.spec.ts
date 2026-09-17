import { RoleName } from '@prisma/client';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let prisma: {
    vehicle: { findMany: jest.Mock };
    match: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let leadsService: { findOne: jest.Mock };
  let service: MatchesService;

  const actor = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };

  beforeEach(() => {
    prisma = {
      vehicle: { findMany: jest.fn() },
      match: { upsert: jest.fn(), findMany: jest.fn() },
    };
    leadsService = { findOne: jest.fn() };
    service = new MatchesService(prisma as any, leadsService as any);
  });

  it('enforces row-level access on the lead before recomputing', async () => {
    leadsService.findOne.mockRejectedValue(new Error('no access'));

    await expect(service.recomputeForLead('lead-1', actor)).rejects.toThrow(
      'no access',
    );
    expect(prisma.vehicle.findMany).not.toHaveBeenCalled();
  });

  it('scores only AVAILABLE, non-deleted vehicles and returns them sorted by score', async () => {
    leadsService.findOne.mockResolvedValue({
      id: 'lead-1',
      preferences: { manufacturer: 'Toyota' },
    });
    prisma.vehicle.findMany.mockResolvedValue([
      {
        id: 'v-low',
        manufacturer: 'Mazda',
        model: '3',
        year: 2020,
        mileageKm: 50000,
        listPrice: null,
        bodyType: null,
        gearbox: null,
        fuelType: null,
        color: null,
      },
      {
        id: 'v-high',
        manufacturer: 'Toyota',
        model: 'Corolla',
        year: 2022,
        mileageKm: 10000,
        listPrice: 100000,
        bodyType: null,
        gearbox: null,
        fuelType: null,
        color: null,
      },
    ]);
    prisma.match.upsert.mockImplementation(({ create }) =>
      Promise.resolve({ ...create }),
    );

    const results = await service.recomputeForLead('lead-1', actor);

    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'AVAILABLE' }),
      }),
    );
    expect(results[0].vehicleId).toBe('v-high'); // Toyota match scores higher
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('does not scope findForVehicle by owner (it is not row-level like leads)', async () => {
    prisma.match.findMany.mockResolvedValue([]);

    await service.findForVehicle('vehicle-1');

    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vehicleId: 'vehicle-1' } }),
    );
  });
});
