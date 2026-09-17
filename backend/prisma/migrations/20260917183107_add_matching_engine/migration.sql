-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "body_type" TEXT,
ADD COLUMN     "fuel_type" TEXT,
ADD COLUMN     "gearbox" TEXT;

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "explanation" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_vehicle_id_idx" ON "matches"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_lead_id_vehicle_id_key" ON "matches"("lead_id", "vehicle_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
