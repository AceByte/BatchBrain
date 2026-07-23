import { Client } from "pg";
import { NextResponse } from "next/server";

type ArchiveType = "premix" | "cocktail";

type ArchiveBody = {
  type?: ArchiveType;
  id?: string;
  archived?: boolean;
};

type CopySpec = {
  sourceTable: string;
  sourceKey: string;
  targetTable: string;
};

const COCKTAIL_TABLES = {
  main: {
    sourceTable: "cocktails",
    sourceKey: "id",
    targetTable: "archived_cocktails",
  },
  specs: {
    sourceTable: "cocktail_specs",
    sourceKey: "cocktail_id",
    targetTable: "archived_cocktail_specs",
  },
  premixSpecs: {
    sourceTable: "cocktail_premix_specs",
    sourceKey: "cocktail_id",
    targetTable: "archived_cocktail_premix_specs",
  },
} as const;

const PREMIX_TABLES = {
  main: {
    sourceTable: "premixes",
    sourceKey: "premix_id",
    targetTable: "archived_premixes",
  },
  recipeItems: {
    sourceTable: "premix_recipe_items",
    sourceKey: "premix_id",
    targetTable: "archived_premix_recipe_items",
  },
  productionLogs: {
    sourceTable: "production_logs",
    sourceKey: "premix_id",
    targetTable: "archived_production_logs",
  },
  stockAdjustmentLogs: {
    sourceTable: "stock_adjustment_logs",
    sourceKey: "premix_id",
    targetTable: "archived_stock_adjustment_logs",
  },
} as const;

async function getColumns(client: Client, tableName: string): Promise<string[]> {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );

  return result.rows.map((row) => row.column_name as string);
}

async function countById(client: Client, table: string, key: string, id: string): Promise<number> {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE ${key} = $1`, [id]);
  return Number(result.rows[0]?.count ?? 0);
}

async function copyById(client: Client, spec: CopySpec, id: string): Promise<number> {
  const sourceColumns = await getColumns(client, spec.sourceTable);
  const targetColumns = await getColumns(client, spec.targetTable);
  const sharedColumns = sourceColumns.filter((column) => targetColumns.includes(column));

  if (sharedColumns.length === 0) {
    throw new Error(`No shared columns between ${spec.sourceTable} and ${spec.targetTable}`);
  }

  const cols = sharedColumns.join(", ");
  const query = `
    INSERT INTO ${spec.targetTable} (${cols})
    SELECT ${cols}
    FROM ${spec.sourceTable}
    WHERE ${spec.sourceKey} = $1
    ON CONFLICT DO NOTHING
  `;

  const result = await client.query(query, [id]);
  return result.rowCount ?? 0;
}

async function deleteById(client: Client, table: string, key: string, id: string): Promise<number> {
  const result = await client.query(`DELETE FROM ${table} WHERE ${key} = $1`, [id]);
  return result.rowCount ?? 0;
}

async function ensureArchiveTables(client: Client) {
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS archived_stock_adjustment_logs (
      id BIGINT PRIMARY KEY,
      premix_id TEXT NOT NULL,
      premix_name TEXT NOT NULL,
      old_value NUMERIC(10, 2) NOT NULL,
      new_value NUMERIC(10, 2) NOT NULL,
      delta NUMERIC(10, 2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function archiveCocktail(client: Client, id: string) {
  const sourceCount = await countById(client, COCKTAIL_TABLES.main.sourceTable, COCKTAIL_TABLES.main.sourceKey, id);
  if (sourceCount === 0) {
    return { found: false };
  }

  await copyById(client, COCKTAIL_TABLES.main, id);
  await copyById(client, COCKTAIL_TABLES.specs, id);
  await copyById(client, COCKTAIL_TABLES.premixSpecs, id);

  const archivedCount = await countById(client, COCKTAIL_TABLES.main.targetTable, COCKTAIL_TABLES.main.sourceKey, id);
  if (archivedCount < sourceCount) {
    throw new Error("Archive verification failed for cocktail row");
  }

  const deletedPremixSpecs = await deleteById(client, COCKTAIL_TABLES.premixSpecs.sourceTable, COCKTAIL_TABLES.premixSpecs.sourceKey, id);
  const deletedSpecs = await deleteById(client, COCKTAIL_TABLES.specs.sourceTable, COCKTAIL_TABLES.specs.sourceKey, id);
  const deletedCocktails = await deleteById(client, COCKTAIL_TABLES.main.sourceTable, COCKTAIL_TABLES.main.sourceKey, id);

  return { found: true, deletedPremixSpecs, deletedSpecs, deletedCocktails };
}

async function restoreCocktail(client: Client, id: string) {
  const sourceCount = await countById(client, COCKTAIL_TABLES.main.targetTable, COCKTAIL_TABLES.main.sourceKey, id);
  if (sourceCount === 0) {
    return { found: false };
  }

  await copyById(client, {
    sourceTable: COCKTAIL_TABLES.main.targetTable,
    sourceKey: COCKTAIL_TABLES.main.sourceKey,
    targetTable: COCKTAIL_TABLES.main.sourceTable,
  }, id);
  await copyById(client, {
    sourceTable: COCKTAIL_TABLES.specs.targetTable,
    sourceKey: COCKTAIL_TABLES.specs.sourceKey,
    targetTable: COCKTAIL_TABLES.specs.sourceTable,
  }, id);
  await copyById(client, {
    sourceTable: COCKTAIL_TABLES.premixSpecs.targetTable,
    sourceKey: COCKTAIL_TABLES.premixSpecs.sourceKey,
    targetTable: COCKTAIL_TABLES.premixSpecs.sourceTable,
  }, id);

  const liveCount = await countById(client, COCKTAIL_TABLES.main.sourceTable, COCKTAIL_TABLES.main.sourceKey, id);
  if (liveCount < sourceCount) {
    throw new Error("Restore verification failed for cocktail row");
  }

  const deletedArchivedPremixSpecs = await deleteById(client, COCKTAIL_TABLES.premixSpecs.targetTable, COCKTAIL_TABLES.premixSpecs.sourceKey, id);
  const deletedArchivedSpecs = await deleteById(client, COCKTAIL_TABLES.specs.targetTable, COCKTAIL_TABLES.specs.sourceKey, id);
  const deletedArchivedCocktails = await deleteById(client, COCKTAIL_TABLES.main.targetTable, COCKTAIL_TABLES.main.sourceKey, id);

  return { found: true, deletedArchivedPremixSpecs, deletedArchivedSpecs, deletedArchivedCocktails };
}

async function archivePremix(client: Client, id: string) {
  const sourceCount = await countById(client, PREMIX_TABLES.main.sourceTable, PREMIX_TABLES.main.sourceKey, id);
  if (sourceCount === 0) {
    return { found: false };
  }

  await copyById(client, PREMIX_TABLES.main, id);
  await copyById(client, PREMIX_TABLES.recipeItems, id);
  await copyById(client, PREMIX_TABLES.productionLogs, id);
  await copyById(client, PREMIX_TABLES.stockAdjustmentLogs, id);

  const archivedCount = await countById(client, PREMIX_TABLES.main.targetTable, PREMIX_TABLES.main.sourceKey, id);
  if (archivedCount < sourceCount) {
    throw new Error("Archive verification failed for premix row");
  }

  const deletedStockAdjustmentLogs = await deleteById(client, PREMIX_TABLES.stockAdjustmentLogs.sourceTable, PREMIX_TABLES.stockAdjustmentLogs.sourceKey, id);
  const deletedProductionLogs = await deleteById(client, PREMIX_TABLES.productionLogs.sourceTable, PREMIX_TABLES.productionLogs.sourceKey, id);
  const deletedRecipeItems = await deleteById(client, PREMIX_TABLES.recipeItems.sourceTable, PREMIX_TABLES.recipeItems.sourceKey, id);
  const deletedPremixes = await deleteById(client, PREMIX_TABLES.main.sourceTable, PREMIX_TABLES.main.sourceKey, id);

  return {
    found: true,
    deletedStockAdjustmentLogs,
    deletedProductionLogs,
    deletedRecipeItems,
    deletedPremixes,
  };
}

async function restorePremix(client: Client, id: string) {
  const sourceCount = await countById(client, PREMIX_TABLES.main.targetTable, PREMIX_TABLES.main.sourceKey, id);
  if (sourceCount === 0) {
    return { found: false };
  }

  await copyById(client, {
    sourceTable: PREMIX_TABLES.main.targetTable,
    sourceKey: PREMIX_TABLES.main.sourceKey,
    targetTable: PREMIX_TABLES.main.sourceTable,
  }, id);

  await copyById(client, {
    sourceTable: PREMIX_TABLES.recipeItems.targetTable,
    sourceKey: PREMIX_TABLES.recipeItems.sourceKey,
    targetTable: PREMIX_TABLES.recipeItems.sourceTable,
  }, id);
  await copyById(client, {
    sourceTable: PREMIX_TABLES.productionLogs.targetTable,
    sourceKey: PREMIX_TABLES.productionLogs.sourceKey,
    targetTable: PREMIX_TABLES.productionLogs.sourceTable,
  }, id);
  await copyById(client, {
    sourceTable: PREMIX_TABLES.stockAdjustmentLogs.targetTable,
    sourceKey: PREMIX_TABLES.stockAdjustmentLogs.sourceKey,
    targetTable: PREMIX_TABLES.stockAdjustmentLogs.sourceTable,
  }, id);

  const liveCount = await countById(client, PREMIX_TABLES.main.sourceTable, PREMIX_TABLES.main.sourceKey, id);
  if (liveCount < sourceCount) {
    throw new Error("Restore verification failed for premix row");
  }

  const deletedArchivedStockAdjustmentLogs = await deleteById(client, PREMIX_TABLES.stockAdjustmentLogs.targetTable, PREMIX_TABLES.stockAdjustmentLogs.sourceKey, id);
  const deletedArchivedProductionLogs = await deleteById(client, PREMIX_TABLES.productionLogs.targetTable, PREMIX_TABLES.productionLogs.sourceKey, id);
  const deletedArchivedRecipeItems = await deleteById(client, PREMIX_TABLES.recipeItems.targetTable, PREMIX_TABLES.recipeItems.sourceKey, id);
  const deletedArchivedPremixes = await deleteById(client, PREMIX_TABLES.main.targetTable, PREMIX_TABLES.main.sourceKey, id);

  return {
    found: true,
    deletedArchivedStockAdjustmentLogs,
    deletedArchivedProductionLogs,
    deletedArchivedRecipeItems,
    deletedArchivedPremixes,
  };
}

export async function PATCH(request: Request) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    const body = (await request.json()) as ArchiveBody;
    const type = body.type;
    const id = body.id?.trim();
    const archived = body.archived;

    if ((type !== "premix" && type !== "cocktail") || !id || typeof archived !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload. Expected type, id, and archived." },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not configured" },
        { status: 500 },
      );
    }

    await client.connect();
    await client.query("BEGIN");
    await ensureArchiveTables(client);

    const primaryResult =
      type === "cocktail"
        ? archived
          ? await archiveCocktail(client, id)
          : await restoreCocktail(client, id)
        : archived
          ? await archivePremix(client, id)
          : await restorePremix(client, id);

    if (!primaryResult.found) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: archived
            ? `${type} not found in live tables`
            : `${type} not found in archived tables`,
        },
        { status: 404 },
      );
    }

    let linkedResult: { found: boolean } | null = null;

    if (type === "cocktail") {
      linkedResult = archived ? await archivePremix(client, id) : await restorePremix(client, id);
    } else {
      linkedResult = archived ? await archiveCocktail(client, id) : await restoreCocktail(client, id);
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      result: {
        primary: primaryResult,
        linked: linkedResult,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors after a failed transaction.
    }

    console.error("Archive PATCH error:", error);

    const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : null;
    if (errorCode === "23503") {
      return NextResponse.json(
        { error: "Cannot archive this premix because dependent logs still reference it." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update archive state",
      },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => {});
  }
}
