import { DealStatus, LeadStatus, VehicleStatus } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let prisma: {
    vehicle: { groupBy: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock };
    deal: { groupBy: jest.Mock; aggregate: jest.Mock };
    lead: { groupBy: jest.Mock };
  };
  let service: ReportsService;

  beforeEach(() => {
    prisma = {
      vehicle: { groupBy: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
      deal: { groupBy: jest.fn(), aggregate: jest.fn() },
      lead: { groupBy: jest.fn() },
    };
    service = new ReportsService(prisma as any);
  });

  describe('getInventoryReport', () => {
    it('summarizes counts by status and available inventory value', async () => {
      prisma.vehicle.groupBy.mockResolvedValue([
        { status: VehicleStatus.AVAILABLE, _count: { _all: 3 } },
        { status: VehicleStatus.SOLD, _count: { _all: 2 } },
      ]);
      prisma.vehicle.aggregate.mockResolvedValue({
        _sum: { listPrice: '315000.00' },
        _count: { _all: 3 },
      });
      prisma.vehicle.findMany.mockResolvedValue([{ createdAt: new Date() }]);

      const result = await service.getInventoryReport();

      expect(result.countByStatus[VehicleStatus.AVAILABLE]).toBe(3);
      expect(result.countByStatus[VehicleStatus.SOLD]).toBe(2);
      expect(result.availableInventoryValue).toBe(315000);
      expect(result.availableVehicleCount).toBe(3);
    });

    it('excludes terminal statuses from the average-age calculation', async () => {
      prisma.vehicle.groupBy.mockResolvedValue([]);
      prisma.vehicle.aggregate.mockResolvedValue({ _sum: { listPrice: null }, _count: { _all: 0 } });
      prisma.vehicle.findMany.mockResolvedValue([]);

      await service.getInventoryReport();

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.objectContaining({
              in: expect.not.arrayContaining([
                VehicleStatus.DELIVERED,
                VehicleStatus.CANCELLED,
              ]),
            }),
          }),
        }),
      );
    });
  });

  describe('getSalesReport', () => {
    it('only counts revenue for paid/ready/delivered deals', async () => {
      prisma.deal.groupBy.mockResolvedValue([
        { status: DealStatus.DELIVERED, _count: { _all: 5 } },
      ]);
      prisma.deal.aggregate.mockResolvedValue({
        _sum: { salePrice: '500000' },
        _count: { _all: 5 },
        _avg: { salePrice: '100000' },
      });

      const result = await service.getSalesReport();

      expect(prisma.deal.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: [DealStatus.PAID, DealStatus.READY_FOR_DELIVERY, DealStatus.DELIVERED],
            },
          },
        }),
      );
      expect(result.totalRevenue).toBe(500000);
      expect(result.averageSalePrice).toBe(100000);
    });
  });

  describe('getLeadsReport', () => {
    it('computes conversion rate from won and lost counts', async () => {
      prisma.lead.groupBy
        .mockResolvedValueOnce([
          { status: LeadStatus.WON, _count: { _all: 3 } },
          { status: LeadStatus.LOST, _count: { _all: 7 } },
          { status: LeadStatus.NEW, _count: { _all: 10 } },
        ])
        .mockResolvedValueOnce([{ source: 'website', _count: { _all: 20 } }]);

      const result = await service.getLeadsReport();

      expect(result.conversionRatePercent).toBe(30);
      expect(result.countBySource.website).toBe(20);
    });
  });

  describe('getMyPerformance', () => {
    it('scopes both queries to the calling user only', async () => {
      prisma.lead.groupBy.mockResolvedValue([]);
      prisma.deal.aggregate.mockResolvedValue({ _sum: { salePrice: null }, _count: { _all: 0 } });

      await service.getMyPerformance({ userId: 'sales-1' });

      expect(prisma.lead.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ownerUserId: 'sales-1' }) }),
      );
      expect(prisma.deal.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ salespersonId: 'sales-1' }),
        }),
      );
    });
  });
});
