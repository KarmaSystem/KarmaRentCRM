ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "archive_until" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "assets_user_id_archive_until_idx" ON "assets"("user_id", "archive_until");
