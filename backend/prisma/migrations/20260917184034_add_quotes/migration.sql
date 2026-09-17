-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "supersedes_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotes_lead_id_idx" ON "quotes"("lead_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
