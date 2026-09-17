-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LICENSE', 'INSPECTION', 'SERVICE_RECORD', 'INVOICE', 'RECEIPT', 'CONTRACT', 'DISCLOSURE', 'TITLE_TRANSFER', 'WARRANTY', 'ID_PHOTO', 'OTHER');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedes_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_stored_file_name_key" ON "documents"("stored_file_name");

-- CreateIndex
CREATE INDEX "documents_entity_type_entity_id_idx" ON "documents"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
