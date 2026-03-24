import "dotenv/config";
import { Client } from "pg";

const IDS_TO_ARCHIVE = [
  "smackery",
  "naughty-and-nice",
  "nutcrackers-sour",
  "ernst-cardamom-syrup",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_cocktails (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        glassware TEXT,
        technique TEXT,
        straining TEXT,
        garnish TEXT,
        is_batched BOOLEAN NOT NULL DEFAULT FALSE,
        serve_extras TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_cocktail_specs (
        id BIGINT PRIMARY KEY,
        cocktail_id TEXT NOT NULL,
        ingredient TEXT NOT NULL,
        ml NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_cocktail_premix_specs (
        id BIGINT PRIMARY KEY,
        cocktail_id TEXT NOT NULL UNIQUE,
        premix_note TEXT,
        batch_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_premixes (
        premix_id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        current_bottles NUMERIC(10, 2) NOT NULL DEFAULT 0,
        threshold_bottles NUMERIC(10, 2) NOT NULL DEFAULT 2,
        target_bottles NUMERIC(10, 2) NOT NULL DEFAULT 6,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS archived_premix_recipe_items (
        id BIGINT PRIMARY KEY,
        premix_id TEXT NOT NULL,
        ingredient_name TEXT NOT NULL,
        amount_per_batch NUMERIC(10, 2) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'parts',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const movedCocktails = await client.query(
      `
      INSERT INTO archived_cocktails
      (id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at)
      SELECT id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at
      FROM cocktails
      WHERE id = ANY($1::text[])
      ON CONFLICT DO NOTHING
      `,
      [IDS_TO_ARCHIVE],
    );

    const movedCocktailSpecs = await client.query(
      `
      INSERT INTO archived_cocktail_specs
      (id, cocktail_id, ingredient, ml, created_at)
      SELECT id, cocktail_id, ingredient, ml, created_at
      FROM cocktail_specs
      WHERE cocktail_id = ANY($1::text[])
      ON CONFLICT DO NOTHING
      `,
      [IDS_TO_ARCHIVE],
    );

    const movedCocktailPremixSpecs = await client.query(
      `
      INSERT INTO archived_cocktail_premix_specs
      (id, cocktail_id, premix_note, batch_note, created_at, updated_at)
      SELECT id, cocktail_id, premix_note, batch_note, created_at, updated_at
      FROM cocktail_premix_specs
      WHERE cocktail_id = ANY($1::text[])
      ON CONFLICT DO NOTHING
      `,
      [IDS_TO_ARCHIVE],
    );

    const movedPremixes = await client.query(
      `
      INSERT INTO archived_premixes
      (premix_id, name, preparation_notes, created_at, updated_at)
      SELECT premix_id, name, NULL::text AS preparation_notes, created_at, updated_at
      FROM premixes
      WHERE premix_id = ANY($1::text[])
      ON CONFLICT DO NOTHING
      `,
      [IDS_TO_ARCHIVE],
    );

    const movedPremixRecipeItems = await client.query(
      `
      INSERT INTO archived_premix_recipe_items
      (id, premix_id, ingredient_name, amount_per_batch, unit, created_at)
      SELECT id, premix_id, ingredient_name, amount_per_batch, unit, created_at
      FROM premix_recipe_items
      WHERE premix_id = ANY($1::text[])
      ON CONFLICT DO NOTHING
      `,
      [IDS_TO_ARCHIVE],
    );

    const deletedCocktailPremixSpecs = await client.query(
      `DELETE FROM cocktail_premix_specs WHERE cocktail_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedCocktailSpecs = await client.query(
      `DELETE FROM cocktail_specs WHERE cocktail_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedPremixRecipeItems = await client.query(
      `DELETE FROM premix_recipe_items WHERE premix_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedStockAdjustmentLogs = await client.query(
      `DELETE FROM stock_adjustment_logs WHERE premix_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedProductionLogs = await client.query(
      `DELETE FROM production_logs WHERE premix_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedPremixes = await client.query(
      `DELETE FROM premixes WHERE premix_id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    const deletedCocktails = await client.query(
      `DELETE FROM cocktails WHERE id = ANY($1::text[])`,
      [IDS_TO_ARCHIVE],
    );

    await client.query("COMMIT");

    console.log("Archive migration completed.");
    console.log("Moved rows:", {
      archived_cocktails: movedCocktails.rowCount,
      archived_cocktail_specs: movedCocktailSpecs.rowCount,
      archived_cocktail_premix_specs: movedCocktailPremixSpecs.rowCount,
      archived_premix_recipe_items: movedPremixRecipeItems.rowCount,
      archived_premixes: movedPremixes.rowCount,
    });
    console.log("Deleted rows:", {
      cocktail_premix_specs: deletedCocktailPremixSpecs.rowCount,
      cocktail_specs: deletedCocktailSpecs.rowCount,
      premix_recipe_items: deletedPremixRecipeItems.rowCount,
      stock_adjustment_logs: deletedStockAdjustmentLogs.rowCount,
      production_logs: deletedProductionLogs.rowCount,
      premixes: deletedPremixes.rowCount,
      cocktails: deletedCocktails.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Archive migration failed:", error);
  process.exit(1);
});
