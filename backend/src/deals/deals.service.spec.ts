import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DealStatus, Prisma, RoleName, VehicleStatus } from '@prisma/client';
import { DealsService } from './deals.service';

function makeUniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: '6.19.3',
  });
}

describe('DealsService', () => {
  let prisma: any;
  let leadsService: { findOne: jest.Mock };
  let auditLog: { record: jest.Mock };
  let service: DealsService;

  const salesperson = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };
  const finance = { userId: 'finance-1', roles: [RoleName.FINANCE] };

  const approvedQuote = {
    id: 'quote-1',
    leadId: 'lead-1',
    vehicleId: 'vehicle-1',
    price: 100000,
    discount: 5000,
    status: 'APPROVED',
  };
  const availableVehicle = {
    id: 'vehicle-1',
    status: VehicleStatus.AVAILABLE,
    version: 3,
    listPrice: 100000,
  };
  const lead = { customerId: 'customer-1', ownerUserId: 'sales-1' };

  beforeEach(() => {
    prisma = {
      quote: { findFirst: jest.fn() },
      vehicle: { findFirst: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
      deal: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
      vehicleEvent: { create: jest.fn() },
      payment: { create: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(prisma)),
    };
    leadsService = { findOne: jest.fn().mockResolvedValue(lead) };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new DealsService(prisma, leadsService as any, auditLog as any);
  });

  describe('create', () => {
    it('refuses to create a deal from a non-approved quote', async () => {
      prisma.quote.findFirst.mockResolvedValue({ ...approvedQuote, status: 'DRAFT' });

      await expect(service.create({ quoteId: 'quote-1' }, salesperson)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.deal.create).not.toHaveBeenCalled();
    });

    it('refuses when the vehicle is no longer available', async () => {
      prisma.quote.findFirst.mockResolvedValue(approvedQuote);
      prisma.vehicle.findFirst.mockResolvedValue({
        ...availableVehicle,
        status: VehicleStatus.SOLD,
      });

      await expect(service.create({ quoteId: 'quote-1' }, salesperson)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates the deal and moves the vehicle to IN_DEAL atomically', async () => {
      prisma.quote.findFirst.mockResolvedValue(approvedQuote);
      prisma.vehicle.findFirst.mockResolvedValue(availableVehicle);
      prisma.deal.create.mockResolvedValue({ id: 'deal-1', salePrice: 95000 });
      prisma.vehicle.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.create({ quoteId: 'quote-1' }, salesperson);

      expect(prisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            salespersonId: 'sales-1',
            salePrice: 95000, // price 100000 - discount 5000
          }),
        }),
      );
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: VehicleStatus.IN_DEAL }),
        }),
      );
      expect(result.id).toBe('deal-1');
    });

    it('translates a database unique-constraint race into a friendly conflict, not a raw 500', async () => {
      prisma.quote.findFirst.mockResolvedValue(approvedQuote);
      prisma.vehicle.findFirst.mockResolvedValue(availableVehicle);
      prisma.deal.create.mockRejectedValue(makeUniqueConstraintError());

      await expect(service.create({ quoteId: 'quote-1' }, salesperson)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateStatus', () => {
    const signedDeal = {
      id: 'deal-1',
      vehicleId: 'vehicle-1',
      salespersonId: 'sales-1',
      salePrice: 100000,
      status: DealStatus.SIGNED,
      version: 1,
    };

    it('blocks delivery when unpaid, without touching the database', async () => {
      prisma.deal.findFirst.mockResolvedValue({
        ...signedDeal,
        status: DealStatus.READY_FOR_DELIVERY,
      });
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      await expect(
        service.updateStatus(
          'deal-1',
          { status: DealStatus.DELIVERED, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.deal.updateMany).not.toHaveBeenCalled();
    });

    it('allows delivery once fully paid, and moves the vehicle to DELIVERED', async () => {
      prisma.deal.findFirst
        .mockResolvedValueOnce({ ...signedDeal, status: DealStatus.READY_FOR_DELIVERY })
        .mockResolvedValueOnce({ ...signedDeal, status: DealStatus.DELIVERED });
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 100000 } });
      prisma.deal.updateMany.mockResolvedValue({ count: 1 });
      prisma.vehicle.findFirst.mockResolvedValue({
        ...availableVehicle,
        status: VehicleStatus.SOLD,
      });

      await service.updateStatus(
        'deal-1',
        { status: DealStatus.DELIVERED, version: 1 },
        salesperson,
      );

      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: VehicleStatus.DELIVERED }),
        }),
      );
    });

    it("blocks a salesperson from changing a colleague's deal", async () => {
      prisma.deal.findFirst.mockResolvedValue({ ...signedDeal, salespersonId: 'sales-2' });

      await expect(
        service.updateStatus('deal-1', { status: DealStatus.PAID, version: 1 }, salesperson),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('payments access (per docs/permissions.md)', () => {
    it("blocks a salesperson from viewing payments, even on their own deal", async () => {
      prisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', salespersonId: 'sales-1' });

      await expect(service.listPayments('deal-1', salesperson)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets Finance record a payment on a deal that is not theirs', async () => {
      prisma.deal.findFirst.mockResolvedValue({ id: 'deal-1', salespersonId: 'sales-1' });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      await expect(
        service.addPayment(
          'deal-1',
          { amount: 1000, method: 'TRANSFER' as any },
          finance,
        ),
      ).resolves.toEqual({ id: 'payment-1' });
    });
  });
});
