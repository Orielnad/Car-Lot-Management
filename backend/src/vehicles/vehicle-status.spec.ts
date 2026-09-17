import { VehicleStatus } from '@prisma/client';
import {
  assertValidVehicleTransition,
  InvalidVehicleTransitionError,
  MissingListPriceError,
} from './vehicle-status';

describe('assertValidVehicleTransition', () => {
  it('allows a legal transition (CANDIDATE -> INTAKE)', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.CANDIDATE,
        nextStatus: VehicleStatus.INTAKE,
        hasListPrice: false,
      }),
    ).not.toThrow();
  });

  it('rejects an illegal transition (CANDIDATE -> AVAILABLE, skipping steps)', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.CANDIDATE,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: true,
      }),
    ).toThrow(InvalidVehicleTransitionError);
  });

  it('rejects moving to AVAILABLE without a list price', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.RECONDITIONING,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: false,
      }),
    ).toThrow(MissingListPriceError);
  });

  it('allows moving to AVAILABLE once a list price exists', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.RECONDITIONING,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: true,
      }),
    ).not.toThrow();
  });

  it('rejects any transition out of a terminal status (DELIVERED)', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.DELIVERED,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: true,
      }),
    ).toThrow(InvalidVehicleTransitionError);
  });

  it('allows a deal falling through back to AVAILABLE (deal cancelled)', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.IN_DEAL,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: true,
      }),
    ).not.toThrow();
  });

  it('allows a SOLD deal being cancelled to return the vehicle to AVAILABLE (spec 21 edge case)', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.SOLD,
        nextStatus: VehicleStatus.AVAILABLE,
        hasListPrice: true,
      }),
    ).not.toThrow();
  });

  it('treats "no change" as always allowed, regardless of list price', () => {
    expect(() =>
      assertValidVehicleTransition({
        currentStatus: VehicleStatus.CANDIDATE,
        nextStatus: VehicleStatus.CANDIDATE,
        hasListPrice: false,
      }),
    ).not.toThrow();
  });
});
