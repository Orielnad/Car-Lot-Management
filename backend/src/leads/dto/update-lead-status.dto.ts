import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;

  @IsOptional()
  @IsString()
  lossReason?: string;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
