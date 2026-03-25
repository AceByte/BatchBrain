import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `DROP TABLE IF EXISTS stock_adjustment_logs CASCADE;`,
  `DROP TABLE IF EXISTS production_logs CASCADE;`,
  `DROP TABLE IF EXISTS cocktail_premix_specs CASCADE;`,
  `DROP TABLE IF EXISTS cocktail_specs CASCADE;`,
  `DROP TABLE IF EXISTS premix_recipe_items CASCADE;`,
  `DROP TABLE IF EXISTS app_config CASCADE;`,
  `DROP TABLE IF EXISTS premixes CASCADE;`,
  `DROP TABLE IF EXISTS cocktails CASCADE;`,

  `DROP TABLE IF EXISTS stock_adjustment_history CASCADE;`,
  `DROP TABLE IF EXISTS prep_logs CASCADE;`,
  `DROP TABLE IF EXISTS cocktail_premix_spec CASCADE;`,
  `DROP TABLE IF EXISTS cocktail_premix_usage CASCADE;`,
  `DROP TABLE IF EXISTS batch_recipes CASCADE;`,
  `DROP TABLE IF EXISTS inventory CASCADE;`,
  `DROP TABLE IF EXISTS config CASCADE;`,

  `
  CREATE TABLE cocktails (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'REGULAR' CHECK (category IN ('REGULAR', 'SEASONAL', 'SIGNATURE')),
    glassware TEXT,
    technique TEXT,
    straining TEXT,
    garnish TEXT,
    is_batched BOOLEAN NOT NULL DEFAULT FALSE,
    serve_extras TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE premixes (
    premix_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    current_bottles NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_bottles >= 0),
    threshold_bottles NUMERIC(10, 2) NOT NULL DEFAULT 2 CHECK (threshold_bottles >= 0),
    target_bottles NUMERIC(10, 2) NOT NULL DEFAULT 6 CHECK (target_bottles >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (target_bottles >= threshold_bottles)
  );
  `,

  `
  CREATE TABLE premix_recipe_items (
    id BIGSERIAL PRIMARY KEY,
    premix_id TEXT NOT NULL REFERENCES premixes(premix_id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    amount_per_batch NUMERIC(10, 2) NOT NULL CHECK (amount_per_batch > 0),
    unit TEXT NOT NULL DEFAULT 'parts',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (premix_id, ingredient_name)
  );
  `,

  `
  CREATE TABLE cocktail_specs (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    ingredient TEXT NOT NULL,
    ml NUMERIC(10, 2) NOT NULL CHECK (ml > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cocktail_id, ingredient)
  );
  `,

  `
  CREATE TABLE cocktail_premix_specs (
    id BIGSERIAL PRIMARY KEY,
    cocktail_id TEXT NOT NULL UNIQUE REFERENCES cocktails(id) ON DELETE CASCADE,
    premix_note TEXT,
    batch_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE production_logs (
    id BIGSERIAL PRIMARY KEY,
    premix_id TEXT NOT NULL REFERENCES premixes(premix_id) ON DELETE RESTRICT,
    produced_bottles NUMERIC(10, 2) NOT NULL CHECK (produced_bottles > 0),
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
  );
  `,

  `
  CREATE TABLE stock_adjustment_logs (
    id BIGSERIAL PRIMARY KEY,
    premix_id TEXT NOT NULL REFERENCES premixes(premix_id) ON DELETE RESTRICT,
    premix_name TEXT NOT NULL,
    old_value NUMERIC(10, 2) NOT NULL,
    new_value NUMERIC(10, 2) NOT NULL,
    delta NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,

  `
  CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
  );
  `,

  `CREATE INDEX idx_premixes_name ON premixes(name);`,
  `CREATE INDEX idx_cocktails_name ON cocktails(name);`,
  `CREATE INDEX idx_cocktail_specs_cocktail ON cocktail_specs(cocktail_id);`,
  `CREATE INDEX idx_cocktail_premix_specs_cocktail ON cocktail_premix_specs(cocktail_id);`,
  `CREATE INDEX idx_recipe_items_premix ON premix_recipe_items(premix_id);`,
  `CREATE INDEX idx_prod_logs_premix_logged ON production_logs(premix_id, logged_at DESC);`,
  `CREATE INDEX idx_prod_logs_logged ON production_logs(logged_at DESC);`,
  `CREATE INDEX idx_stock_logs_premix_created ON stock_adjustment_logs(premix_id, created_at DESC);`,
  `CREATE INDEX idx_stock_logs_created ON stock_adjustment_logs(created_at DESC);`,

  `INSERT INTO app_config (key, value) VALUES ('defaultThresholdDays', '3'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('defaultTargetDays', '7'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('defaultWeeklyDrinksPerCocktail', '10'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('enableLowStockAlerts', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('enableBrowserNotifications', 'false'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('darkMode', 'false'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('autoSaveDrafts', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
  `INSERT INTO app_config (key, value) VALUES ('productionLeadTimeDays', '1'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
];

async function main() {
  console.log("Starting destructive optimized database refactor...");

  await prisma.$executeRawUnsafe("BEGIN");

  try {
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    await prisma.$executeRawUnsafe("COMMIT");
    console.log("Database refactor complete.");
  } catch (error) {
    await prisma.$executeRawUnsafe("ROLLBACK");
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("Database refactor failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
