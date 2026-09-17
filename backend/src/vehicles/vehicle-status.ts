import { VehicleStatus } from '@prisma/client';

/**
 * Allowed status transitions for a vehicle (see docs/data-model.md).
 * Any transition not listed here is rejected — this is the one place that
 * decides what "a valid move" means, so the rule can't drift between
 * different parts of the codebase.
 */
const ALLOWED_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  CANDIDATE: [VehicleStatus.INTAKE, VehicleStatus.CANCELLED],
  INTAKE: [VehicleStatus.RECONDITIONING, VehicleStatus.CANCELLED],
  RECONDITIONING: [
    VehicleStatus.AVAILABLE,
    VehicleStatus.CANCELLED,
    VehicleStatus.RETURNED_TO_SUPPLIER,
  ],
  AVAILABLE: [
    VehicleStatus.RESERVED,
    VehicleStatus.CANCELLED,
    VehicleStatus.RETURNED_TO_SUPPLIER,
  ],
  RESERVED: [VehicleStatus.AVAILABLE, VehicleStatus.IN_DEAL],
  IN_DEAL: [VehicleStatus.SOLD, VehicleStatus.AVAILABLE],
  // AVAILABLE is reachable from SOLD too: spec section 21's explicit edge
  // case is a sold deal getting cancelled, returning the vehicle to
  // inventory while the deal and its cancellation costs stay on record
  // (see DealsService — cancelling a deal never deletes it, only flips
  // status, so nothing here contradicts "don't lose history").
  SOLD: [VehicleStatus.DELIVERED, VehicleStatus.AVAILABLE],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED_TO_SUPPLIER: [],
};

export class InvalidVehicleTransitionError extends Error {
  constructor(from: VehicleStatus, to: VehicleStatus) {
    super(`לא ניתן לשנות סטטוס רכב מ-${from} ל-${to}.`);
    this.name = 'InvalidVehicleTransitionError';
  }
}

export class MissingListPriceError extends Error {
  constructor() {
    super('חסר מחיר פרסום (listPrice). יש להזין אותו לפני העברת הרכב לזמין.');
    this.name = 'MissingListPriceError';
  }
}

export interface VehicleTransitionCheckInput {
  currentStatus: VehicleStatus;
  nextStatus: VehicleStatus;
  hasListPrice: boolean;
}

/**
 * Throws if the requested status change isn't allowed. Mirrors the business
 * rule in docs/architecture.md: "לא ניתן לסמן רכב כזמין לפני השלמת שדות חובה".
 */
export function assertValidVehicleTransition({
  currentStatus,
  nextStatus,
  hasListPrice,
}: VehicleTransitionCheckInput): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    throw new InvalidVehicleTransitionError(currentStatus, nextStatus);
  }

  if (nextStatus === VehicleStatus.AVAILABLE && !hasListPrice) {
    throw new MissingListPriceError();
  }
}
