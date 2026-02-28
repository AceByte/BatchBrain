-- Add notes column to prep_logs for production logging
ALTER TABLE prep_logs ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_prep_logs_time ON prep_logs("Time" DESC);
CREATE INDEX IF NOT EXISTS idx_prep_logs_cocktail ON prep_logs(cocktail_id);
