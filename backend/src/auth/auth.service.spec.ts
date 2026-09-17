import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let auditLog: { record: jest.Mock };
  let authService: AuthService;

  const activeUser = {
    id: 'user-1',
    email: 'sales@demo.local',
    passwordHash: '',
    isActive: true,
    deletedAt: null,
    branchId: 'branch-1',
    fullName: 'איש מכירות',
    roles: [{ role: 'SALESPERSON' }],
  };

  beforeEach(async () => {
    activeUser.passwordHash = await bcrypt.hash('correct-password', 4);

    prisma = { user: { findUnique: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    configService = { get: jest.fn().mockReturnValue('test-secret') };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    authService = new AuthService(
      prisma as any,
      jwtService as any,
      configService as any,
      auditLog as any,
    );
  });

  it('logs in a user with the correct password and returns a token', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const result = await authService.login(
      'sales@demo.local',
      'correct-password',
    );

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.user.email).toBe('sales@demo.local');
    expect(result.user.roles).toEqual(['SALESPERSON']);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', entityId: 'user-1' }),
    );
  });

  it('rejects a wrong password with a generic message', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await expect(
      authService.login('sales@demo.local', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a login for a user that does not exist, with the same generic message as a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login('nobody@demo.local', 'whatever123'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a login for a deactivated user even with the correct password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(
      authService.login('sales@demo.local', 'correct-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a login for a soft-deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date(),
    });

    await expect(
      authService.login('sales@demo.local', 'correct-password'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
