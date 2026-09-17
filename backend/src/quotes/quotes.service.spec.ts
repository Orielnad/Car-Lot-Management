import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { QuoteStatus, RoleName } from '@prisma/client';
import { QuotesService } from './quotes.service';

describe('QuotesService', () => {
  let prisma: {
    quote: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let leadsService: { findOne: jest.Mock };
  let auditLog: { record: jest.Mock };
  let service: QuotesService;

  const salesperson = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };
  const manager = { userId: 'manager-1', roles: [RoleName.SALES_MANAGER] };

  const draftQuote = {
    id: 'quote-1',
    leadId: 'lead-1',
    vehicleId: 'vehicle-1',
    price: 100000,
    discount: 0,
    status: QuoteStatus.DRAFT,
    version: 1,
  };

  beforeEach(() => {
    prisma = {
      quote: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    leadsService = { findOne: jest.fn().mockResolvedValue({}) };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new QuotesService(prisma as any, leadsService as any, auditLog as any);
  });

  describe('discount approval tier', () => {
    it('refuses a salesperson creating a quote with more than 10% discount', async () => {
      await expect(
        service.create(
          'lead-1',
          { vehicleId: 'v1', price: 100000, discount: 15000, validUntil: '2027-01-01' },
          salesperson,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });

    it('lets a sales manager create a quote with a large discount', async () => {
      prisma.quote.create.mockResolvedValue({ id: 'new-quote' });

      await service.create(
        'lead-1',
        { vehicleId: 'v1', price: 100000, discount: 15000, validUntil: '2027-01-01' },
        manager,
      );

      expect(prisma.quote.create).toHaveBeenCalled();
    });

    it('lets a salesperson create a quote with a small discount', async () => {
      prisma.quote.create.mockResolvedValue({ id: 'new-quote' });

      await service.create(
        'lead-1',
        { vehicleId: 'v1', price: 100000, discount: 5000, validUntil: '2027-01-01' },
        salesperson,
      );

      expect(prisma.quote.create).toHaveBeenCalled();
    });

    it('rejects a discount greater than or equal to the price', async () => {
      await expect(
        service.create(
          'lead-1',
          { vehicleId: 'v1', price: 100000, discount: 100000, validUntil: '2027-01-01' },
          manager,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revise', () => {
    it('creates a new quote linked via supersedesId instead of editing the old one', async () => {
      prisma.quote.findFirst.mockResolvedValue(draftQuote);
      prisma.quote.create.mockResolvedValue({ id: 'quote-2', supersedesId: 'quote-1' });

      const result = await service.revise(
        'quote-1',
        { vehicleId: 'vehicle-1', price: 95000, discount: 0, validUntil: '2027-01-01' },
        salesperson,
      );

      expect(prisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ supersedesId: 'quote-1' }),
        }),
      );
      expect(result.supersedesId).toBe('quote-1');
    });

    it('refuses to revise an already-approved quote', async () => {
      prisma.quote.findFirst.mockResolvedValue({
        ...draftQuote,
        status: QuoteStatus.APPROVED,
      });

      await expect(
        service.revise(
          'quote-1',
          { vehicleId: 'vehicle-1', price: 95000, validUntil: '2027-01-01' },
          salesperson,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quote.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('rejects an illegal transition as a 400', async () => {
      prisma.quote.findFirst.mockResolvedValue(draftQuote);

      await expect(
        service.updateStatus(
          'quote-1',
          { status: QuoteStatus.APPROVED, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quote.updateMany).not.toHaveBeenCalled();
    });

    it('raises a conflict on a stale version', async () => {
      prisma.quote.findFirst.mockResolvedValue(draftQuote);
      prisma.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateStatus(
          'quote-1',
          { status: QuoteStatus.SENT, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
