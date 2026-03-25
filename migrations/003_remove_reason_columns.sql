-- Remove legacy reason columns from stock adjustment tables.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS stock_adjustment_logs
  DROP COLUMN IF EXISTS reason;

ALTER TABLE IF EXISTS archived_stock_adjustment_logs
  DROP COLUMN IF EXISTS reason;

ALTER TABLE IF EXISTS stock_adjustment_history
  DROP COLUMN IF EXISTS reason;
