import { IsEnum, IsInt } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class UpdateQuoteStatusDto {
  @IsEnum(QuoteStatus)
  status!: QuoteStatus;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
