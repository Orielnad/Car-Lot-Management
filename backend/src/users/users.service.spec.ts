import { ConflictException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };
  let authService: { hashPassword: jest.Mock };
  let auditLog: { record: jest.Mock };
  let usersService: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    authService = { hashPassword: jest.fn().mockResolvedValue('hashed') };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    usersService = new UsersService(
      prisma as any,
      authService as any,
      auditLog as any,
    );
  });

  it('refuses to create a user whose email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      usersService.create(
        {
          fullName: 'שם',
          email: 'taken@demo.local',
          password: 'password123',
          roles: [RoleName.SALESPERSON],
        },
        'actor-1',
      ),
    ).rejects.toThrow(ConflictException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('hashes the password and never stores or returns the raw one', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'new-user',
      fullName: 'שם',
      email: 'new@demo.local',
      passwordHash: 'hashed',
      branchId: null,
      roles: [{ role: RoleName.SALESPERSON }],
    });

    const result = await usersService.create(
      {
        fullName: 'שם',
        email: 'new@demo.local',
        password: 'super-secret-password',
        roles: [RoleName.SALESPERSON],
      },
      'actor-1',
    );

    expect(authService.hashPassword).toHaveBeenCalledWith(
      'super-secret-password',
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: 'hashed' }),
      }),
    );
    expect((result as any).passwordHash).toBeUndefined();
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityId: 'new-user' }),
    );
  });
});
