import type { VehicleStatus } from './types';

/**
 * Mirrors backend/src/vehicles/vehicle-status.ts's ALLOWED_TRANSITIONS, so the
 * status dropdown only offers moves the server will actually accept — a UX
 * convenience only. The server re-validates every request; this list is not
 * itself an authorization or business-rule boundary.
 */
export const ALLOWED_VEHICLE_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  CANDIDATE: ['INTAKE', 'CANCELLED'],
  INTAKE: ['RECONDITIONING', 'CANCELLED'],
  RECONDITIONING: ['AVAILABLE', 'CANCELLED', 'RETURNED_TO_SUPPLIER'],
  AVAILABLE: ['RESERVED', 'CANCELLED', 'RETURNED_TO_SUPPLIER'],
  RESERVED: ['AVAILABLE', 'IN_DEAL'],
  IN_DEAL: ['SOLD', 'AVAILABLE'],
  SOLD: ['DELIVERED', 'AVAILABLE'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED_TO_SUPPLIER: [],
};
