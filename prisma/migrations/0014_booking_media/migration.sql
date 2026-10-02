CREATE TABLE "booking_media" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'PHOTO',
  "filename" TEXT,
  "data_url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "booking_media_booking_id_created_at_idx" ON "booking_media"("booking_id", "created_at");
ALTER TABLE "booking_media" ADD CONSTRAINT "booking_media_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_media" ADD CONSTRAINT "booking_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
