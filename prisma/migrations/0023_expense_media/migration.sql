CREATE TABLE "expense_media" (
  "id" TEXT NOT NULL,
  "expense_id" TEXT NOT NULL,
  "filename" TEXT,
  "data_url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_media_expense_id_created_at_idx" ON "expense_media"("expense_id", "created_at");

ALTER TABLE "expense_media"
  ADD CONSTRAINT "expense_media_expense_id_fkey"
  FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
