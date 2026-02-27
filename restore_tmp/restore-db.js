const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const base = path.join(__dirname, 'data from database');
const cocktails = JSON.parse(fs.readFileSync(path.join(base, 'cocktails.json'), 'utf8'));
const cocktailSpecs = JSON.parse(fs.readFileSync(path.join(base, 'cocktail_specs.json'), 'utf8'));
const batchRecipes = JSON.parse(fs.readFileSync(path.join(base, 'batch_recipes.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(base, 'inventory.json'), 'utf8'));

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      DROP TABLE IF EXISTS "StockEvent" CASCADE;
      DROP TABLE IF EXISTS "CocktailPremix" CASCADE;
      DROP TABLE IF EXISTS "PremixIngredient" CASCADE;
      DROP TABLE IF EXISTS "Cocktail" CASCADE;
      DROP TABLE IF EXISTS "Premix" CASCADE;
      DROP TABLE IF EXISTS "Ingredient" CASCADE;
      DROP TYPE IF EXISTS "CocktailCategory";

      DROP TABLE IF EXISTS batch_recipes CASCADE;
      DROP TABLE IF EXISTS cocktail_specs CASCADE;
      DROP TABLE IF EXISTS cocktails CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS prep_logs CASCADE;
      DROP TABLE IF EXISTS config CASCADE;

      CREATE TABLE cocktails (
        "cocktailId" TEXT PRIMARY KEY,
        name TEXT,
        tag TEXT,
        glassware TEXT,
        technique TEXT,
        straining TEXT,
        garnish TEXT,
        is_batched BOOLEAN,
        serve_extras TEXT
      );

      CREATE TABLE cocktail_specs (
        cocktail_id TEXT,
        ingredient TEXT,
        ml INTEGER
      );

      CREATE TABLE batch_recipes (
        cocktail_id TEXT,
        ingredient TEXT,
        parts INTEGER
      );

      CREATE TABLE inventory (
        "cocktailId" TEXT PRIMARY KEY,
        name TEXT,
        count INTEGER,
        threshold INTEGER
      );

      CREATE TABLE prep_logs (
        id SERIAL PRIMARY KEY,
        date TEXT,
        cocktail_id TEXT,
        amount REAL,
        "Time" TIMESTAMPTZ(6)
      );

      CREATE TABLE config (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `);

    for (const c of cocktails) {
      await client.query(
        `INSERT INTO cocktails ("cocktailId", name, tag, glassware, technique, straining, garnish, is_batched, serve_extras)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [c.cocktailId, c.name ?? null, c.tag ?? null, c.glassware ?? null, c.technique ?? null, c.straining ?? null, c.garnish ?? null, c.is_batched ?? null, c.serve_extras ?? null],
      );
    }

    for (const s of cocktailSpecs) {
      await client.query(
        `INSERT INTO cocktail_specs (cocktail_id, ingredient, ml) VALUES ($1,$2,$3)`,
        [s.cocktail_id ?? null, s.ingredient ?? null, s.ml ?? null],
      );
    }

    for (const b of batchRecipes) {
      await client.query(
        `INSERT INTO batch_recipes (cocktail_id, ingredient, parts) VALUES ($1,$2,$3)`,
        [b.cocktail_id ?? null, b.ingredient ?? null, b.parts ?? null],
      );
    }

    for (const i of inventory) {
      await client.query(
        `INSERT INTO inventory ("cocktailId", name, count, threshold) VALUES ($1,$2,$3,$4)`,
        [i.cocktailId, i.name ?? null, i.count ?? null, i.threshold ?? null],
      );
    }

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT 'cocktails' AS table_name, COUNT(*)::int AS row_count FROM cocktails
      UNION ALL SELECT 'cocktail_specs', COUNT(*)::int FROM cocktail_specs
      UNION ALL SELECT 'batch_recipes', COUNT(*)::int FROM batch_recipes
      UNION ALL SELECT 'inventory', COUNT(*)::int FROM inventory
      UNION ALL SELECT 'prep_logs', COUNT(*)::int FROM prep_logs
      UNION ALL SELECT 'config', COUNT(*)::int FROM config
      ORDER BY table_name;
    `);

    console.log('Restore complete. Row counts:');
    for (const row of counts.rows) {
      console.log(`${row.table_name}: ${row.row_count}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
