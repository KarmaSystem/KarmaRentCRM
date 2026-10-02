ALTER TABLE "assets" ADD COLUMN "current_mileage" INTEGER;
ALTER TABLE "assets" ADD COLUMN "service_mileage" INTEGER;
ALTER TABLE "assets" DROP COLUMN "next_service_date";
CREATE INDEX "assets_user_id_service_mileage_idx" ON "assets"("user_id", "service_mileage");
