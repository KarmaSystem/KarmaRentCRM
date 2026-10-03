ALTER TABLE "bookings"
  ADD COLUMN "extension_start_date" TIMESTAMP(3),
  ADD COLUMN "extension_end_date" TIMESTAMP(3),
  ADD COLUMN "extension_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extension_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
