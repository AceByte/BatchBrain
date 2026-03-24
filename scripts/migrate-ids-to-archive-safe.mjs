import "dotenv/config";
import { Client } from "pg";

const IDS_TO_ARCHIVE = [
  "smackery",
  "naughty-and-nice",
  "nutcrackers-sour",
  "ernst-cardamom-syrup",
];

const TABLES = {
  cocktails: { source: "cocktails", key: "id", archive: "archived_cocktails", archiveKey: "id" },
  cocktailSpecs: { source: "cocktail_specs", key: "cocktail_id", archive: "archived_cocktail_specs", archiveKey: "cocktail_id" },
  cocktailPremixSpecs: {
    source: "cocktail_premix_specs",
    key: "cocktail_id",
    archive: "archived_cocktail_premix_specs",
    archiveKey: "cocktail_id",
  },
  premixes: { source: "premixes", key: "premix_id", archive: "archived_premixes", archiveKey: "premix_id" },
  premixRecipeItems: {
    source: "premix_recipe_items",
    key: "premix_id",
    archive: "archived_premix_recipe_items",
    archiveKey: "premix_id",
  },
  stockAdjustmentLogs: {
    source: "stock_adjustment_logs",
    key: "premix_id",
    archive: "archived_stock_adjustment_logs",
    archiveKey: "premix_id",
  },
  productionLogs: {
    source: "production_logs",
    key: "premix_id",
    archive: "archived_production_logs",
    archiveKey: "premix_id",
  },
};

async function getColumns(client, tableName) {
  const result = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    [tableName],
  );
  return result.rows.map((row) => row.column_name);
}

async function countRows(client, table, key, ids) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${key} = ANY($1::text[])`,
    [ids],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function ensureArchiveTables(client) {
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
      current_bottles NUMERIC(10, 2),
      threshold_bottles NUMERIC(10, 2),
      target_bottles NUMERIC(10, 2),
      preparation_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE archived_premixes ADD COLUMN IF NOT EXISTS current_bottles NUMERIC(10, 2);
    ALTER TABLE archived_premixes ADD COLUMN IF NOT EXISTS threshold_bottles NUMERIC(10, 2);
    ALTER TABLE archived_premixes ADD COLUMN IF NOT EXISTS target_bottles NUMERIC(10, 2);
    ALTER TABLE archived_premixes ADD COLUMN IF NOT EXISTS preparation_notes TEXT;
    ALTER TABLE archived_premixes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS archived_stock_adjustment_logs (
      id BIGINT PRIMARY KEY,
      premix_id TEXT NOT NULL,
      premix_name TEXT NOT NULL,
      old_value NUMERIC(10, 2) NOT NULL,
      new_value NUMERIC(10, 2) NOT NULL,
      delta NUMERIC(10, 2) NOT NULL,
      reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS archived_production_logs (
      id BIGINT PRIMARY KEY,
      premix_id TEXT NOT NULL,
      produced_bottles NUMERIC(10, 2) NOT NULL,
      production_date DATE NOT NULL,
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function copyRows(client, sourceTable, sourceKey, archiveTable, ids) {
  const sourceColumns = await getColumns(client, sourceTable);
  const archiveColumns = await getColumns(client, archiveTable);

  const commonColumns = sourceColumns.filter((col) => archiveColumns.includes(col));
  if (commonColumns.length === 0) {
    throw new Error(`No common columns between ${sourceTable} and ${archiveTable}`);
  }

  const columnsSql = commonColumns.join(", ");

  const insertSql = `
    INSERT INTO ${archiveTable} (${columnsSql})
    SELECT ${columnsSql}
    FROM ${sourceTable}
    WHERE ${sourceKey} = ANY($1::text[])
    ON CONFLICT DO NOTHING
  `;

  const result = await client.query(insertSql, [ids]);
  return result.rowCount;
}

async function deleteRows(client, table, key, ids) {
  const result = await client.query(`DELETE FROM ${table} WHERE ${key} = ANY($1::text[])`, [ids]);
  return result.rowCount;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureArchiveTables(client);

    const before = {};
    for (const [name, cfg] of Object.entries(TABLES)) {
      before[name] = await countRows(client, cfg.source, cfg.key, IDS_TO_ARCHIVE);
    }

    const copied = {};
    copied.cocktails = await copyRows(client, TABLES.cocktails.source, TABLES.cocktails.key, TABLES.cocktails.archive, IDS_TO_ARCHIVE);
    copied.cocktailSpecs = await copyRows(client, TABLES.cocktailSpecs.source, TABLES.cocktailSpecs.key, TABLES.cocktailSpecs.archive, IDS_TO_ARCHIVE);
    copied.cocktailPremixSpecs = await copyRows(
      client,
      TABLES.cocktailPremixSpecs.source,
      TABLES.cocktailPremixSpecs.key,
      TABLES.cocktailPremixSpecs.archive,
      IDS_TO_ARCHIVE,
    );
    copied.premixes = await copyRows(client, TABLES.premixes.source, TABLES.premixes.key, TABLES.premixes.archive, IDS_TO_ARCHIVE);
    copied.premixRecipeItems = await copyRows(
      client,
      TABLES.premixRecipeItems.source,
      TABLES.premixRecipeItems.key,
      TABLES.premixRecipeItems.archive,
      IDS_TO_ARCHIVE,
    );
    copied.stockAdjustmentLogs = await copyRows(
      client,
      TABLES.stockAdjustmentLogs.source,
      TABLES.stockAdjustmentLogs.key,
      TABLES.stockAdjustmentLogs.archive,
      IDS_TO_ARCHIVE,
    );
    copied.productionLogs = await copyRows(
      client,
      TABLES.productionLogs.source,
      TABLES.productionLogs.key,
      TABLES.productionLogs.archive,
      IDS_TO_ARCHIVE,
    );

    const archiveCounts = {};
    for (const [name, cfg] of Object.entries(TABLES)) {
      archiveCounts[name] = await countRows(client, cfg.archive, cfg.archiveKey, IDS_TO_ARCHIVE);
      if (archiveCounts[name] < before[name]) {
        throw new Error(
          `Archive verification failed for ${name}: source before=${before[name]}, archive now=${archiveCounts[name]}`,
        );
      }
    }

    const deleted = {};
    deleted.cocktailPremixSpecs = await deleteRows(
      client,
      TABLES.cocktailPremixSpecs.source,
      TABLES.cocktailPremixSpecs.key,
      IDS_TO_ARCHIVE,
    );
    deleted.cocktailSpecs = await deleteRows(client, TABLES.cocktailSpecs.source, TABLES.cocktailSpecs.key, IDS_TO_ARCHIVE);
    deleted.premixRecipeItems = await deleteRows(
      client,
      TABLES.premixRecipeItems.source,
      TABLES.premixRecipeItems.key,
      IDS_TO_ARCHIVE,
    );
    deleted.stockAdjustmentLogs = await deleteRows(
      client,
      TABLES.stockAdjustmentLogs.source,
      TABLES.stockAdjustmentLogs.key,
      IDS_TO_ARCHIVE,
    );
    deleted.productionLogs = await deleteRows(client, TABLES.productionLogs.source, TABLES.productionLogs.key, IDS_TO_ARCHIVE);
    deleted.premixes = await deleteRows(client, TABLES.premixes.source, TABLES.premixes.key, IDS_TO_ARCHIVE);
    deleted.cocktails = await deleteRows(client, TABLES.cocktails.source, TABLES.cocktails.key, IDS_TO_ARCHIVE);

    const liveAfter = {};
    for (const [name, cfg] of Object.entries(TABLES)) {
      liveAfter[name] = await countRows(client, cfg.source, cfg.key, IDS_TO_ARCHIVE);
      if (liveAfter[name] !== 0) {
        throw new Error(`Live table cleanup failed for ${name}: ${liveAfter[name]} row(s) still present`);
      }
    }

    await client.query("COMMIT");

    console.log("Safe archive migration completed.");
    console.log("IDs:", IDS_TO_ARCHIVE);
    console.log("Source rows before:", before);
    console.log("Copied rows this run:", copied);
    console.log("Archive rows now:", archiveCounts);
    console.log("Deleted rows:", deleted);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Safe archive migration failed:", error);
  process.exit(1);
});
