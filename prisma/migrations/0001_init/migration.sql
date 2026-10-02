-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AssetCategory" AS ENUM ('MOTORCYCLE', 'SCOOTER', 'CAR', 'REAL_ESTATE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'UNAVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('RENTAL', 'DEPOSIT', 'DEPOSIT_RETURN', 'REFUND', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('MAINTENANCE', 'REPAIR', 'WASH', 'FUEL', 'INSURANCE', 'PARTS', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "company_name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."AssetCategory" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "registration_number" TEXT,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_type" "public"."PaymentType" NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "public"."ExpenseCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_blocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "public"."users"("telegram_id");

-- CreateIndex
CREATE INDEX "assets_user_id_status_idx" ON "public"."assets"("user_id", "status");

-- CreateIndex
CREATE INDEX "assets_user_id_category_idx" ON "public"."assets"("user_id", "category");

-- CreateIndex
CREATE INDEX "bookings_user_id_start_date_end_date_idx" ON "public"."bookings"("user_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "bookings_asset_id_start_date_end_date_idx" ON "public"."bookings"("asset_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "bookings_user_id_status_idx" ON "public"."bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "payments_user_id_payment_date_idx" ON "public"."payments"("user_id", "payment_date");

-- CreateIndex
CREATE INDEX "expenses_user_id_date_idx" ON "public"."expenses"("user_id", "date");

-- CreateIndex
CREATE INDEX "expenses_user_id_category_idx" ON "public"."expenses"("user_id", "category");

-- CreateIndex
CREATE INDEX "asset_blocks_asset_id_start_date_end_date_idx" ON "public"."asset_blocks"("asset_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "public"."notifications"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_type_reference_id_scheduled_at_key" ON "public"."notifications"("user_id", "type", "reference_id", "scheduled_at");

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_blocks" ADD CONSTRAINT "asset_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_blocks" ADD CONSTRAINT "asset_blocks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

