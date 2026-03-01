import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toCategory(tag) {
  const normalized = String(tag ?? "REGULAR").trim().toUpperCase();
  if (normalized === "SEASONAL") return "SEASONAL";
  if (normalized === "SIGNATURE") return "SIGNATURE";
  return "REGULAR";
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value, fallback = 0) {
  const n = parseNumber(value, fallback);
  return Number.isFinite(n) ? String(n) : String(fallback);
}

function parsePremixMlFromNote(note) {
  if (!note) return null;
  const lines = String(note)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstPremixLine = lines.find((line) => /premix/i.test(line));
  if (!firstPremixLine) return null;

  const match = firstPremixLine.match(/([0-9]+(?:\.[0-9]+)?)\s*(cl|ml)\b/i);
  if (!match) return null;

  const amount = parseNumber(match[1], 0);
  const unit = match[2].toLowerCase();

  if (unit === "cl") return amount * 10;
  return amount;
}

async function main() {
  const backupArg = process.argv[2] ?? "backups/db-backup-2026-03-01T19-26-37-168Z.json";
  const backupPath = resolve(process.cwd(), backupArg);

  if (!existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const backup = JSON.parse(readFileSync(backupPath, "utf8"));
  const tables = backup?.tables ?? {};

  const cocktails = tables.cocktails?.rows ?? [];
  const inventory = tables.inventory?.rows ?? [];
  const batchRecipes = tables.batch_recipes?.rows ?? [];
  const cocktailSpecs = tables.cocktail_specs?.rows ?? [];
  const premixSpecs = tables.cocktail_premix_spec?.rows ?? [];
  const configRows = tables.config?.rows ?? [];

  const batchYieldByPremix = new Map();
  for (const row of batchRecipes) {
    const premixId = String(row.cocktail_id ?? "").trim();
    if (!premixId) continue;
    const current = batchYieldByPremix.get(premixId) ?? 0;
    batchYieldByPremix.set(premixId, current + parseNumber(row.parts, 0));
  }

  const recipeItemsUnique = new Map();
  for (const row of batchRecipes) {
    const premixId = String(row.cocktail_id ?? "").trim();
    const ingredientName = String(row.ingredient ?? "").trim();
    if (!premixId || !ingredientName) continue;

    const key = `${premixId}__${ingredientName.toLowerCase()}`;
    if (recipeItemsUnique.has(key)) continue;

    recipeItemsUnique.set(key, {
      premixId,
      ingredientName,
      amountPerBatch: parseNumber(row.parts, 0),
      unit: "parts",
    });
  }

  const specsByCocktail = new Map();
  for (const row of cocktailSpecs) {
    const cocktailId = String(row.cocktail_id ?? "").trim();
    if (!cocktailId) continue;

    const current = specsByCocktail.get(cocktailId) ?? 0;
    specsByCocktail.set(cocktailId, current + parseNumber(row.ml, 0));
  }

  const cocktailNameById = new Map(
    cocktails
      .map((row) => [String(row.cocktailId ?? "").trim(), String(row.name ?? "").trim()])
      .filter(([id]) => Boolean(id)),
  );

  const inventoryByPremixId = new Map(
    inventory
      .map((row) => [String(row.cocktailId ?? "").trim(), row])
      .filter(([id]) => Boolean(id)),
  );

  const premixIds = new Set([
    ...inventoryByPremixId.keys(),
    ...batchYieldByPremix.keys(),
  ]);

  await prisma.$executeRawUnsafe("BEGIN");

  try {
    await prisma.$executeRawUnsafe("DELETE FROM stock_adjustment_logs");
    await prisma.$executeRawUnsafe("DELETE FROM production_logs");
    await prisma.$executeRawUnsafe("DELETE FROM cocktail_premix_specs");
    await prisma.$executeRawUnsafe("DELETE FROM cocktail_specs");
    await prisma.$executeRawUnsafe("DELETE FROM premix_recipe_items");
    await prisma.$executeRawUnsafe("DELETE FROM premixes");
    await prisma.$executeRawUnsafe("DELETE FROM cocktails");
    await prisma.$executeRawUnsafe("DELETE FROM app_config");

    for (const row of configRows) {
      const key = String(row.key ?? "").trim();
      if (!key) continue;
      const valueJson = JSON.stringify(row.value ?? null).replace(/'/g, "''");
      await prisma.$executeRawUnsafe(
        `INSERT INTO app_config (key, value) VALUES (${sqlString(key)}, '${valueJson}'::jsonb)`,
      );
    }

    for (const row of cocktails) {
      const id = String(row.cocktailId ?? "").trim();
      if (!id) continue;

      await prisma.$executeRawUnsafe(`
        INSERT INTO cocktails (
          id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras
        ) VALUES (
          ${sqlString(id)},
          ${sqlString(row.name ?? id)},
          ${sqlString(toCategory(row.tag))},
          ${sqlString(row.glassware)},
          ${sqlString(row.technique)},
          ${sqlString(row.straining)},
          ${sqlString(row.garnish)},
          ${parseBoolean(row.is_batched, false) ? "TRUE" : "FALSE"},
          ${sqlString(row.serve_extras)}
        )
      `);
    }

    for (const premixId of premixIds) {
      const row = inventoryByPremixId.get(premixId);

      const currentBottles = parseNumber(row?.count, 0);
      const thresholdBottles = parseNumber(row?.threshold, 2);
      const batchYield = Math.max(1, parseNumber(batchYieldByPremix.get(premixId), 0));
      const targetBottles = Math.max(thresholdBottles, thresholdBottles + batchYield);
      const premixName =
        String(row?.name ?? "").trim() ||
        String(cocktailNameById.get(premixId) ?? "").trim() ||
        premixId;

      await prisma.$executeRawUnsafe(`
        INSERT INTO premixes (
          premix_id, name, current_bottles, threshold_bottles, target_bottles
        ) VALUES (
          ${sqlString(premixId)},
          ${sqlString(premixName)},
          ${sqlNumber(currentBottles, 0)},
          ${sqlNumber(thresholdBottles, 2)},
          ${sqlNumber(targetBottles, 6)}
        )
      `);
    }

    for (const item of recipeItemsUnique.values()) {
      if (item.amountPerBatch <= 0) continue;
      await prisma.$executeRawUnsafe(`
        INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
        VALUES (
          ${sqlString(item.premixId)},
          ${sqlString(item.ingredientName)},
          ${sqlNumber(item.amountPerBatch, 0)},
          ${sqlString(item.unit)}
        )
      `);
    }

    // Insert cocktail specs (non-batched cocktail ingredients)
    for (const row of cocktailSpecs) {
      const cocktailId = String(row.cocktail_id ?? "").trim();
      const ingredient = String(row.ingredient ?? "").trim();
      const ml = parseNumber(row.ml, 0);

      if (!cocktailId || !ingredient || ml <= 0) continue;

      await prisma.$executeRawUnsafe(`
        INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
        VALUES (
          ${sqlString(cocktailId)},
          ${sqlString(ingredient)},
          ${sqlNumber(ml, 0)}
        )
        ON CONFLICT (cocktail_id, ingredient) DO UPDATE 
        SET ml = EXCLUDED.ml
      `);
    }

    // Insert cocktail premix specs (notes for batched cocktails)
    for (const row of premixSpecs) {
      const cocktailId = String(row.cocktail_id ?? "").trim();
      if (!cocktailId) continue;

      await prisma.$executeRawUnsafe(`
        INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at)
        VALUES (
          ${sqlString(cocktailId)},
          ${sqlString(row.premix_note)},
          ${sqlString(row.batch_note)},
          COALESCE(${sqlString(row.created_at)}::timestamptz, NOW()),
          COALESCE(${sqlString(row.updated_at)}::timestamptz, NOW())
        )
        ON CONFLICT (cocktail_id) DO UPDATE 
        SET premix_note = EXCLUDED.premix_note, batch_note = EXCLUDED.batch_note, updated_at = EXCLUDED.updated_at
      `);
    }

    await prisma.$executeRawUnsafe("COMMIT");

    console.log("Restore complete.");
    console.log(`cocktails: ${cocktails.length}`);
    console.log(`premixes: ${premixIds.size}`);
    console.log(`recipe items: ${recipeItemsUnique.size}`);
    console.log(`cocktail specs: ${cocktailSpecs.length}`);
    console.log(`cocktail premix specs: ${premixSpecs.length}`);
    console.log(`config keys: ${configRows.length}`);
  } catch (error) {
    await prisma.$executeRawUnsafe("ROLLBACK");
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("Restore failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
