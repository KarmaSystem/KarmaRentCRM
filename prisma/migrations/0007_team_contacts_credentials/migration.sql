ALTER TABLE "team_members" ALTER COLUMN "telegram_id" DROP NOT NULL;
ALTER TABLE "team_members" ADD COLUMN "phone" TEXT;
ALTER TABLE "team_members" ADD COLUMN "email" TEXT;
ALTER TABLE "team_members" ADD COLUMN "password_hash" TEXT;
CREATE INDEX "team_members_owner_id_email_idx" ON "team_members"("owner_id", "email");
