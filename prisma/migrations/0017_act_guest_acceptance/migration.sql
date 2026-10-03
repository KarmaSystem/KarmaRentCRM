ALTER TABLE "handover_acts"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "shared_at" TIMESTAMP(3),
  ADD COLUMN "accepted_at" TIMESTAMP(3),
  ADD COLUMN "accepted_name" TEXT,
  ADD COLUMN "accepted_ip" TEXT,
  ADD COLUMN "accepted_user_agent" TEXT;
CREATE INDEX "handover_acts_status_idx" ON "handover_acts"("status");
