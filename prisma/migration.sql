-- Run after Prisma migration on PostgreSQL to harden overlap protection where desired.
-- Application validation remains the portable guard used by the API.
CREATE INDEX IF NOT EXISTS bookings_asset_period_idx ON bookings (asset_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS asset_blocks_period_idx ON asset_blocks (asset_id, start_date, end_date);
