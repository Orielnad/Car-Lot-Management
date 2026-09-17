import { IsString } from 'class-validator';

export class CreateDealDto {
  @IsString()
  quoteId!: string;
}
