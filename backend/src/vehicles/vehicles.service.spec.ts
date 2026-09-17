import { BadRequestException, ConflictException } from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  let prisma: {
    vehicle: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    vehicleEvent: { create: jest.Mock; findMany: jest.Mock };
    expense: { create: jest.Mock };
  };
  let auditLog: { record: jest.Mock };
  let service: VehiclesService;

  const baseVehicle = {
    id: 'vehicle-1',
    branchId: 'branch-1',
    licensePlate: '12-345-67',
    vin: 'VIN123',
    status: VehicleStatus.CANDIDATE,
    listPrice: null,
    version: 1,
    expenses: [],
  };

  beforeEach(() => {
    prisma = {
      vehicle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      vehicleEvent: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
      expense: { create: jest.fn() },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    service = new VehiclesService(prisma as any, auditLog as any);
  });

  describe('create', () => {
    it('refuses to create a vehicle whose license plate or VIN already exists', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(baseVehicle);

      await expect(
        service.create(
          {
            branchId: 'branch-1',
            licensePlate: '12-345-67',
            manufacturer: 'Toyota',
            model: 'Corolla',
            year: 2020,
          },
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });

    it('creates a vehicle as CANDIDATE and records history + audit log', async () => {
      prisma.vehicle.findFirst.mockResolvedValueOnce(null); // duplicate check
      prisma.vehicle.create.mockResolvedValue({
        ...baseVehicle,
        id: 'new-vehicle',
      });

      const result = await service.create(
        {
          branchId: 'branch-1',
          manufacturer: 'Toyota',
          model: 'Corolla',
          year: 2020,
        },
        'actor-1',
      );

      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: VehicleStatus.CANDIDATE }),
        }),
      );
      expect(prisma.vehicleEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CREATED' }),
        }),
      );
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityId: 'new-vehicle' }),
      );
      expect(result.id).toBe('new-vehicle');
    });
  });

  describe('updateStatus', () => {
    it('rejects moving to AVAILABLE without a list price, before touching the database, as a 400', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        ...baseVehicle,
        status: VehicleStatus.RECONDITIONING,
        listPrice: null,
      });

      await expect(
        service.updateStatus(
          'vehicle-1',
          { status: VehicleStatus.AVAILABLE, version: 1 },
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('rejects an illegal status jump as a 400, not an unhandled 500', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        ...baseVehicle,
        status: VehicleStatus.CANDIDATE,
      });

      await expect(
        service.updateStatus(
          'vehicle-1',
          { status: VehicleStatus.AVAILABLE, version: 1 },
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it('raises a conflict when the version sent by the client is stale', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        ...baseVehicle,
        status: VehicleStatus.CANDIDATE,
      });
      prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateStatus(
          'vehicle-1',
          { status: VehicleStatus.INTAKE, version: 1 },
          'actor-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('applies a legal transition and logs the change', async () => {
      prisma.vehicle.findFirst
        .mockResolvedValueOnce({ ...baseVehicle, status: VehicleStatus.CANDIDATE })
        .mockResolvedValueOnce({
          ...baseVehicle,
          status: VehicleStatus.INTAKE,
          version: 2,
        });
      prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateStatus(
        'vehicle-1',
        { status: VehicleStatus.INTAKE, version: 1 },
        'actor-1',
      );

      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-1', version: 1, deletedAt: null },
        }),
      );
      expect(result.status).toBe(VehicleStatus.INTAKE);
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STATUS_CHANGE' }),
      );
    });
  });
});
