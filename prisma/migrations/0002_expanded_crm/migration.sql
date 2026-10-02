CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER');
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FIXED');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER';
ALTER TABLE "users" ADD COLUMN "permissions" JSONB;
ALTER TABLE "assets" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "assets" ADD COLUMN "status_color" TEXT NOT NULL DEFAULT '#50b8ed';
CREATE TABLE "partners" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "commission_type" "CommissionType" NOT NULL,
  "commission_value" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "handover_acts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "public_token" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "handover_acts_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "bookings" ADD COLUMN "partner_id" TEXT;
CREATE UNIQUE INDEX "handover_acts_booking_id_key" ON "handover_acts"("booking_id");
CREATE UNIQUE INDEX "handover_acts_public_token_key" ON "handover_acts"("public_token");
CREATE INDEX "partners_user_id_name_idx" ON "partners"("user_id", "name");
CREATE INDEX "handover_acts_user_id_created_at_idx" ON "handover_acts"("user_id", "created_at");
CREATE INDEX "assets_user_id_sort_order_idx" ON "assets"("user_id", "sort_order");
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handover_acts" ADD CONSTRAINT "handover_acts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handover_acts" ADD CONSTRAINT "handover_acts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
