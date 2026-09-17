import { IsEnum, IsInt } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  /** The version the client last read — used for optimistic locking. */
  @IsInt()
  version!: number;
}
