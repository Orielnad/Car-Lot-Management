import { IsEnum, IsInt } from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatus)
  status!: VehicleStatus;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
