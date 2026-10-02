ALTER TABLE "bookings" ADD COLUMN "deposit_currency" TEXT NOT NULL DEFAULT '₫';
ALTER TABLE "bookings" ADD COLUMN "passport_photo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN "mileage_limit_per_day" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "phone_holder" TEXT;
ALTER TABLE "bookings" ADD COLUMN "helmet_count" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "mileage_at_handover" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "fuel_level" TEXT;
