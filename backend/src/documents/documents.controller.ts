import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { MAX_FILE_SIZE_BYTES } from './file-validation';
import { TaskEntityType } from '../tasks/dto/create-task.dto';

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAllForEntity(
    @Query('entityType') entityType: TaskEntityType,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAllForEntity(entityType, entityId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.findOne(id, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  upload(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(dto, file, user);
  }

  @Post(':id/revise')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  revise(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.revise(id, file, user);
  }

  @Get(':id/download')
  @Header('Content-Disposition', 'attachment')
  async download(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const { document, buffer } = await this.documentsService.download(id, user);
    return new StreamableFile(buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(document.originalFileName)}"`,
    });
  }
}
