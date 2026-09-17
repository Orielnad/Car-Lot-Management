import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows any authenticated user when no @Roles() is declared', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const allowed = guard.canActivate(
      buildContext({ userId: 'u1', roles: [RoleName.VIEWER] }),
    );

    expect(allowed).toBe(true);
  });

  it('denies a user who lacks every required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.OWNER]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const allowed = guard.canActivate(
      buildContext({ userId: 'u1', roles: [RoleName.SALESPERSON] }),
    );

    expect(allowed).toBe(false);
  });

  it('allows a user who has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([RoleName.OWNER, RoleName.SALES_MANAGER]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const allowed = guard.canActivate(
      buildContext({ userId: 'u1', roles: [RoleName.SALES_MANAGER] }),
    );

    expect(allowed).toBe(true);
  });

  it('denies an unauthenticated request even for a role-restricted route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.OWNER]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    const allowed = guard.canActivate(buildContext(undefined));

    expect(allowed).toBe(false);
  });
});
