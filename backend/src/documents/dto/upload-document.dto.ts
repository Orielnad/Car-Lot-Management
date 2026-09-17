import { IsEnum, IsIn, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';
import { TASK_ENTITY_TYPES, TaskEntityType } from '../../tasks/dto/create-task.dto';

export class UploadDocumentDto {
  @IsIn(TASK_ENTITY_TYPES)
  entityType!: TaskEntityType;

  @IsString()
  entityId!: string;

  @IsEnum(DocumentType)
  docType!: DocumentType;
}
