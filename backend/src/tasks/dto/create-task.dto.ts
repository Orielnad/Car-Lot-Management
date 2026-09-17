import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskType } from '@prisma/client';

export const TASK_ENTITY_TYPES = ['Lead', 'Customer', 'Vehicle', 'Deal'] as const;
export type TaskEntityType = (typeof TASK_ENTITY_TYPES)[number];

export class CreateTaskDto {
  @IsIn(TASK_ENTITY_TYPES)
  entityType!: TaskEntityType;

  @IsString()
  entityId!: string;

  @IsEnum(TaskType)
  type!: TaskType;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Only OWNER/SALES_MANAGER may assign to someone else; see TasksService. */
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
