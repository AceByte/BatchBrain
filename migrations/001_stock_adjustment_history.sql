-- Stock adjustment history tracking
CREATE TABLE IF NOT EXISTS stock_adjustment_history (
  id SERIAL PRIMARY KEY,
  cocktail_id TEXT NOT NULL,
  premix_name TEXT NOT NULL,
  old_value REAL NOT NULL,
  new_value REAL NOT NULL,  
  delta REAL NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_adj_cocktail ON stock_adjustment_history(cocktail_id);
CREATE INDEX idx_stock_adj_created ON stock_adjustment_history(created_at DESC);
