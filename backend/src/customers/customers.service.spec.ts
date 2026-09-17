import { BadRequestException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let prisma: { customer: { findFirst: jest.Mock; create: jest.Mock } };
  let auditLog: { record: jest.Mock };
  let service: CustomersService;

  beforeEach(() => {
    prisma = {
      customer: { findFirst: jest.fn(), create: jest.fn() },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new CustomersService(prisma as any, auditLog as any);
  });

  it('refuses to create a customer whose phone number already exists', async () => {
    prisma.customer.findFirst.mockResolvedValue({
      id: 'existing',
      fullName: 'ישראל ישראלי',
    });

    await expect(
      service.create(
        { fullName: 'מישהו אחר', phone: '0501234567' },
        'actor-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('creates a customer and records an audit log entry', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    prisma.customer.create.mockResolvedValue({
      id: 'new-customer',
      fullName: 'ישראל ישראלי',
      phone: '0501234567',
    });

    const result = await service.create(
      { fullName: 'ישראל ישראלי', phone: '0501234567' },
      'actor-1',
    );

    expect(result.id).toBe('new-customer');
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityId: 'new-customer' }),
    );
  });
});
