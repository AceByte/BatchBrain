import "dotenv/config";
import { Client } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Fetch all cocktails (active + archived)
    const cocktails = await client.query(`
      SELECT
        id,
        name,
        category,
        glassware,
        technique,
        straining,
        garnish,
        is_batched,
        serve_extras,
        created_at,
        updated_at
      FROM cocktails
      ORDER BY name ASC
    `);

    const archivedCocktails = await client.query(`
      SELECT
        id,
        name,
        category,
        glassware,
        technique,
        straining,
        garnish,
        is_batched,
        serve_extras,
        created_at,
        updated_at
      FROM archived_cocktails
      ORDER BY name ASC
    `);

    // Fetch all cocktail specs
    const cocktailSpecs = await client.query(`
      SELECT
        cocktail_id,
        ingredient,
        ml
      FROM cocktail_specs
      ORDER BY cocktail_id, id
    `);

    const archivedCocktailSpecs = await client.query(`
      SELECT
        cocktail_id,
        ingredient,
        ml
      FROM archived_cocktail_specs
      ORDER BY cocktail_id, id
    `);

    // Fetch all cocktail premix specs (batch notes)
    const cocktailPremixSpecs = await client.query(`
      SELECT
        cocktail_id,
        premix_note,
        batch_note,
        created_at,
        updated_at
      FROM cocktail_premix_specs
      ORDER BY cocktail_id
    `);

    const archivedCocktailPremixSpecs = await client.query(`
      SELECT
        cocktail_id,
        premix_note,
        batch_note,
        created_at,
        updated_at
      FROM archived_cocktail_premix_specs
      ORDER BY cocktail_id
    `);

    // Fetch all premixes
    const premixes = await client.query(`
      SELECT
        premix_id,
        name,
        current_bottles,
        threshold_bottles,
        target_bottles,
        created_at,
        updated_at
      FROM premixes
      ORDER BY name ASC
    `);

    const archivedPremixes = await client.query(`
      SELECT
        premix_id,
        name,
        current_bottles,
        threshold_bottles,
        target_bottles,
        created_at,
        updated_at
      FROM archived_premixes
      ORDER BY name ASC
    `);

    // Fetch all premix recipe items
    const premixRecipeItems = await client.query(`
      SELECT
        premix_id,
        ingredient_name,
        amount_per_batch,
        unit,
        created_at
      FROM premix_recipe_items
      ORDER BY premix_id, id
    `);

    const archivedPremixRecipeItems = await client.query(`
      SELECT
        premix_id,
        ingredient_name,
        amount_per_batch,
        unit,
        created_at
      FROM archived_premix_recipe_items
      ORDER BY premix_id, id
    `);

    // Build comprehensive spec sheet
    const specs = {
      exportedAt: new Date().toISOString(),
      summary: {
        activeCocktails: cocktails.rows.length,
        archivedCocktails: archivedCocktails.rows.length,
        activePremixes: premixes.rows.length,
        archivedPremixes: archivedPremixes.rows.length,
      },
      cocktails: {
        active: cocktails.rows.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          glassware: c.glassware,
          technique: c.technique,
          straining: c.straining,
          garnish: c.garnish,
          isBatched: c.is_batched,
          serveExtras: c.serve_extras,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          specs: cocktailSpecs.rows
            .filter((s) => s.cocktail_id === c.id)
            .map((s) => ({
              ingredient: s.ingredient,
              ml: Number(s.ml),
            })),
          premixSpec: cocktailPremixSpecs.rows.find((p) => p.cocktail_id === c.id) || null,
        })),
        archived: archivedCocktails.rows.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          glassware: c.glassware,
          technique: c.technique,
          straining: c.straining,
          garnish: c.garnish,
          isBatched: c.is_batched,
          serveExtras: c.serve_extras,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          specs: archivedCocktailSpecs.rows
            .filter((s) => s.cocktail_id === c.id)
            .map((s) => ({
              ingredient: s.ingredient,
              ml: Number(s.ml),
            })),
          premixSpec: archivedCocktailPremixSpecs.rows.find((p) => p.cocktail_id === c.id) || null,
        })),
      },
      premixes: {
        active: premixes.rows.map((p) => ({
          premixId: p.premix_id,
          name: p.name,
          currentBottles: Number(p.current_bottles),
          thresholdBottles: Number(p.threshold_bottles),
          targetBottles: Number(p.target_bottles),
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          recipeItems: premixRecipeItems.rows
            .filter((r) => r.premix_id === p.premix_id)
            .map((r) => ({
              ingredientName: r.ingredient_name,
              amountPerBatch: Number(r.amount_per_batch),
              unit: r.unit,
              createdAt: r.created_at,
            })),
        })),
        archived: archivedPremixes.rows.map((p) => ({
          premixId: p.premix_id,
          name: p.name,
          currentBottles: Number(p.current_bottles),
          thresholdBottles: Number(p.threshold_bottles),
          targetBottles: Number(p.target_bottles),
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          recipeItems: archivedPremixRecipeItems.rows
            .filter((r) => r.premix_id === p.premix_id)
            .map((r) => ({
              ingredientName: r.ingredient_name,
              amountPerBatch: Number(r.amount_per_batch),
              unit: r.unit,
              createdAt: r.created_at,
            })),
        })),
      },
    };

    // Write to file
    const fileName = `spec-sheet-complete-${new Date().toISOString().split("T")[0]}.json`;
    const filePath = path.join(__dirname, "..", "backups", fileName);

    fs.writeFileSync(filePath, JSON.stringify(specs, null, 2));

    console.log("✓ Complete spec sheet exported successfully.");
    console.log(`  File: ${filePath}`);
    console.log(`  Cocktails: ${specs.summary.activeCocktails} active, ${specs.summary.archivedCocktails} archived`);
    console.log(`  Premixes: ${specs.summary.activePremixes} active, ${specs.summary.archivedPremixes} archived`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to export complete spec sheet:", error);
  process.exit(1);
});
