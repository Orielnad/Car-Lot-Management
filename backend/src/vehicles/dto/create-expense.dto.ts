import { IsEnum, IsOptional, IsPositive, IsString } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
