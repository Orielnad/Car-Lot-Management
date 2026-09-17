import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LeadStatus, RoleName } from '@prisma/client';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  let prisma: {
    lead: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let auditLog: { record: jest.Mock };
  let service: LeadsService;

  const salesperson = { userId: 'sales-1', roles: [RoleName.SALESPERSON] };
  const manager = { userId: 'manager-1', roles: [RoleName.SALES_MANAGER] };

  const leadOwnedBySales1 = {
    id: 'lead-1',
    customerId: 'customer-1',
    ownerUserId: 'sales-1',
    status: LeadStatus.NEW,
    lossReason: null,
    version: 1,
  };

  beforeEach(() => {
    prisma = {
      lead: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new LeadsService(prisma as any, auditLog as any);
  });

  describe('row-level access', () => {
    it('lets a salesperson read their own lead', async () => {
      prisma.lead.findFirst.mockResolvedValue(leadOwnedBySales1);

      await expect(service.findOne('lead-1', salesperson)).resolves.toEqual(
        leadOwnedBySales1,
      );
    });

    it("blocks a salesperson from reading a colleague's lead", async () => {
      prisma.lead.findFirst.mockResolvedValue({
        ...leadOwnedBySales1,
        ownerUserId: 'sales-2',
      });

      await expect(service.findOne('lead-1', salesperson)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lets a sales manager read any salesperson's lead", async () => {
      prisma.lead.findFirst.mockResolvedValue(leadOwnedBySales1);

      await expect(service.findOne('lead-1', manager)).resolves.toEqual(
        leadOwnedBySales1,
      );
    });

    it('scopes findAll to own leads only for a salesperson', async () => {
      prisma.lead.findMany.mockResolvedValue([]);

      await service.findAll(salesperson);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerUserId: 'sales-1' }),
        }),
      );
    });

    it('does not scope findAll for a sales manager', async () => {
      prisma.lead.findMany.mockResolvedValue([]);

      await service.findAll(manager);

      const call = prisma.lead.findMany.mock.calls[0][0];
      expect(call.where.ownerUserId).toBeUndefined();
    });
  });

  describe('create', () => {
    it('refuses a salesperson assigning a lead to someone else', async () => {
      await expect(
        service.create(
          { customerId: 'c1', source: 'website', ownerUserId: 'sales-2' },
          salesperson,
        ),
      ).rejects.toThrow('אין לך הרשאה');
      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it('defaults ownership to the creating salesperson', async () => {
      prisma.lead.create.mockResolvedValue({ id: 'new-lead' });

      await service.create({ customerId: 'c1', source: 'website' }, salesperson);

      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerUserId: 'sales-1' }),
        }),
      );
    });

    it('lets a sales manager assign a lead to a specific salesperson', async () => {
      prisma.lead.create.mockResolvedValue({ id: 'new-lead' });

      await service.create(
        { customerId: 'c1', source: 'website', ownerUserId: 'sales-2' },
        manager,
      );

      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerUserId: 'sales-2' }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('rejects LOST without a reason as a 400', async () => {
      prisma.lead.findFirst.mockResolvedValue(leadOwnedBySales1);

      await expect(
        service.updateStatus(
          'lead-1',
          { status: LeadStatus.LOST, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow('סיבת הפסד');
      expect(prisma.lead.updateMany).not.toHaveBeenCalled();
    });

    it('raises a conflict on a stale version', async () => {
      prisma.lead.findFirst.mockResolvedValue(leadOwnedBySales1);
      prisma.lead.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateStatus(
          'lead-1',
          { status: LeadStatus.CONTACTED, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it("blocks a salesperson from changing a colleague's lead status", async () => {
      prisma.lead.findFirst.mockResolvedValue({
        ...leadOwnedBySales1,
        ownerUserId: 'sales-2',
      });

      await expect(
        service.updateStatus(
          'lead-1',
          { status: LeadStatus.CONTACTED, version: 1 },
          salesperson,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
