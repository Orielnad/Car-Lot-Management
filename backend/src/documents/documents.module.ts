import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { FileStorageService } from './file-storage.service';
import { LeadsModule } from '../leads/leads.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [LeadsModule, DealsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FileStorageService],
})
export class DocumentsModule {}
