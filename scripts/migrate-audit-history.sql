-- Non-destructive BatchBrain audit, alias, and preparation migration.
-- bottles_per_batch is the existing premix batch-yield field; do not add a duplicate yield column.
ALTER TABLE premixes
  ADD COLUMN IF NOT EXISTS bottles_per_batch numeric NOT NULL DEFAULT 1;

ALTER TABLE premixes
  ADD COLUMN IF NOT EXISTS prep_deadline date;

ALTER TABLE stock_adjustment_logs
  ADD COLUMN IF NOT EXISTS reversal_of_id bigint;

CREATE UNIQUE INDEX IF NOT EXISTS stock_adjustment_logs_reversal_of_id_key
  ON stock_adjustment_logs (reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ingredient_aliases (
  alias text PRIMARY KEY,
  canonical_name text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_aliases_nonempty_check CHECK (length(trim(alias)) > 0 AND length(trim(canonical_name)) > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_adjustment_logs_reversal_of_id_fkey'
  ) THEN
    ALTER TABLE stock_adjustment_logs
      ADD CONSTRAINT stock_adjustment_logs_reversal_of_id_fkey
      FOREIGN KEY (reversal_of_id) REFERENCES stock_adjustment_logs(id)
      ON DELETE RESTRICT;
  END IF;
END $$;
