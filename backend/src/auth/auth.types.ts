import { RoleName } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  branchId: string | null;
  roles: RoleName[];
}
