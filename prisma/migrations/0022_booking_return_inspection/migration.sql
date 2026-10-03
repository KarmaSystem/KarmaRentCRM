-- Store the inspection details recorded when a vehicle is accepted back.
ALTER TABLE "bookings" ADD COLUMN "return_mileage" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "return_comment" TEXT;
ALTER TABLE "bookings" ADD COLUMN "return_surcharge_type" TEXT;
