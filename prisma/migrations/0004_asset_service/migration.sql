ALTER TABLE "assets" ADD COLUMN "next_service_date" TIMESTAMP(3);
ALTER TABLE "assets" ADD COLUMN "service_note" TEXT;
CREATE INDEX "assets_user_id_next_service_date_idx" ON "assets"("user_id", "next_service_date");
