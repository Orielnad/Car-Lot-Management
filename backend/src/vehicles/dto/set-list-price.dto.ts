import { IsInt, IsPositive } from 'class-validator';

export class SetListPriceDto {
  @IsPositive()
  listPrice!: number;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
