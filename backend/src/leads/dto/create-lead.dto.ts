import { IsDateString, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  customerId!: string;

  @IsString()
  @MinLength(1)
  source!: string;

  /** Only OWNER/SALES_MANAGER may assign to someone else; see LeadsService. */
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}
