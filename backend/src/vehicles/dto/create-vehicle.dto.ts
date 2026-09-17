import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  branchId!: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsString()
  @MinLength(1)
  manufacturer!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileageKm?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsPositive()
  purchasePrice?: number;
}
