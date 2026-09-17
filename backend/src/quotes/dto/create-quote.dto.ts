import { IsDateString, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsString()
  vehicleId!: string;

  @IsPositive()
  price!: number;

  @IsOptional()
  @Min(0)
  discount?: number;

  @IsDateString()
  validUntil!: string;
}
