import { IsEnum, IsInt } from 'class-validator';
import { DealStatus } from '@prisma/client';

export class UpdateDealStatusDto {
  @IsEnum(DealStatus)
  status!: DealStatus;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
