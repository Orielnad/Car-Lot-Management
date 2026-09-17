-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SIGNED', 'PAID', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CREDIT_CARD', 'CHECK', 'CASH', 'FINANCING', 'TRADE_IN');

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "salesperson_id" TEXT NOT NULL,
    "sale_price" DECIMAL(12,2) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deals_quote_id_key" ON "deals"("quote_id");

-- CreateIndex
CREATE INDEX "deals_salesperson_id_idx" ON "deals"("salesperson_id");

-- CreateIndex
CREATE INDEX "deals_vehicle_id_idx" ON "deals"("vehicle_id");

-- CreateIndex
CREATE INDEX "payments_deal_id_idx" ON "payments"("deal_id");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
-- Critical business rule (spec section 20): a vehicle can be sold in at
-- most one ACTIVE deal at a time. This is a partial unique index, which
-- Prisma's schema.prisma DSL cannot express, so it's hand-written here.
-- It is the real enforcement — application code also checks this, but only
-- this index is safe against a race between two concurrent requests.
CREATE UNIQUE INDEX "deals_one_active_per_vehicle" ON "deals"("vehicle_id") WHERE "status" != 'CANCELLED';
