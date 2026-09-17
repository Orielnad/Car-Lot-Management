-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('CANDIDATE', 'INTAKE', 'RECONDITIONING', 'AVAILABLE', 'RESERVED', 'IN_DEAL', 'SOLD', 'DELIVERED', 'CANCELLED', 'RETURNED_TO_SUPPLIER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('PURCHASE', 'RECONDITIONING', 'TRANSPORT', 'MARKETING', 'OTHER');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "license_plate" TEXT,
    "vin" TEXT,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage_km" INTEGER,
    "color" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'CANDIDATE',
    "purchase_price" DECIMAL(12,2),
    "list_price" DECIMAL(12,2),
    "location" TEXT,
    "responsible_user_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_events" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "field_changed" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_events_vehicle_id_idx" ON "vehicle_events"("vehicle_id");

-- CreateIndex
CREATE INDEX "expenses_vehicle_id_idx" ON "expenses"("vehicle_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
