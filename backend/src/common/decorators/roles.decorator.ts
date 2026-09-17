import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring at least one of the given roles.
 * Enforced server-side by RolesGuard — never rely on hiding a UI button.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
