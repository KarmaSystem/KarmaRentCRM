-- Store the condition and surcharge recorded when a vehicle is accepted back.
ALTER TABLE "bookings" ADD COLUMN "return_fuel_level" TEXT;
ALTER TABLE "bookings" ADD COLUMN "return_surcharge" DECIMAL(12, 2) NOT NULL DEFAULT 0;
