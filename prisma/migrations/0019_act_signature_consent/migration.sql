ALTER TABLE "handover_acts" ADD COLUMN "accepted_signature" TEXT;
ALTER TABLE "handover_acts" ADD COLUMN "accepted_consent" BOOLEAN NOT NULL DEFAULT false;
