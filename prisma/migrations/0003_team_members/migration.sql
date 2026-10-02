CREATE TABLE "team_members" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "telegram_id" BIGINT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
  "permissions" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_members_telegram_id_key" ON "team_members"("telegram_id");
CREATE INDEX "team_members_owner_id_active_idx" ON "team_members"("owner_id", "active");
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
