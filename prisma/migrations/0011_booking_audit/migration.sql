CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "actor_name" TEXT NOT NULL,
  "actor_role" TEXT,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "audit_logs_user_id_entity_entity_id_created_at_idx" ON "audit_logs"("user_id", "entity", "entity_id", "created_at");
