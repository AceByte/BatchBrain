import "dotenv/config";
import { Client } from "pg";

const velvetReve = {
  id: "velvet_reve",
  name: "Velvet Reve",
  category: "SIGNATURE",
  glassware: "Nick and Nora glass",
  technique: "Stirred with ice, strained, served without ice",
  straining: null,
  garnish: null,
  isBatched: true,
  serveExtras: null,
  specs: [
    { ingredient: "Non Alcoholic Amaretto", ml: 40 },
    { ingredient: "Rhubarb Syrup", ml: 20 },
    { ingredient: "Arensbak Red", ml: 20 },
    { ingredient: "Versjus", ml: 30 },
  ],
  premixSpec: {
    premixNote: "11cl Premix",
    batchNote: "4 parts non alcoholic amaretto\n2 parts rhubarb syrup\n2 parts arensbak red\n3 parts versjus",
  },
  premix: {
    premixId: "velvet_reve",
    name: "Velvet Reve",
    currentBottles: 0,
    thresholdBottles: 2,
    targetBottles: 6,
    recipeItems: [
      { ingredientName: "Non Alcoholic Amaretto", amountPerBatch: 4, unit: "parts" },
      { ingredientName: "Rhubarb Syrup", amountPerBatch: 2, unit: "parts" },
      { ingredientName: "Arensbak Red", amountPerBatch: 2, unit: "parts" },
      { ingredientName: "Versjus", amountPerBatch: 3, unit: "parts" },
    ],
  },
};

async function upsertCocktail(client, cocktail) {
  await client.query(
    `
      INSERT INTO cocktails (
        id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras, updated_at
      ) VALUES (
        $1, $2, $3::"CocktailCategory", $4, $5, $6, $7, $8, $9, NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        glassware = EXCLUDED.glassware,
        technique = EXCLUDED.technique,
        straining = EXCLUDED.straining,
        garnish = EXCLUDED.garnish,
        is_batched = EXCLUDED.is_batched,
        serve_extras = EXCLUDED.serve_extras,
        updated_at = NOW()
    `,
    [
      cocktail.id,
      cocktail.name,
      cocktail.category,
      cocktail.glassware,
      cocktail.technique,
      cocktail.straining,
      cocktail.garnish,
      cocktail.isBatched,
      cocktail.serveExtras,
    ],
  );

  await client.query(`DELETE FROM cocktail_specs WHERE cocktail_id = $1`, [cocktail.id]);

  for (const spec of cocktail.specs) {
    await client.query(
      `
        INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
        VALUES ($1, $2, $3)
      `,
      [cocktail.id, spec.ingredient, spec.ml],
    );
  }

  await client.query(
    `
      INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (cocktail_id)
      DO UPDATE SET
        premix_note = EXCLUDED.premix_note,
        batch_note = EXCLUDED.batch_note,
        updated_at = NOW()
    `,
    [cocktail.id, cocktail.premixSpec.premixNote, cocktail.premixSpec.batchNote],
  );
}

async function upsertPremix(client, premix) {
  await client.query(
    `
      INSERT INTO premixes (
        premix_id, name, current_bottles, threshold_bottles, target_bottles, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (premix_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        current_bottles = EXCLUDED.current_bottles,
        threshold_bottles = EXCLUDED.threshold_bottles,
        target_bottles = EXCLUDED.target_bottles,
        updated_at = NOW()
    `,
    [
      premix.premixId,
      premix.name,
      premix.currentBottles,
      premix.thresholdBottles,
      premix.targetBottles,
    ],
  );

  await client.query(`DELETE FROM premix_recipe_items WHERE premix_id = $1`, [premix.premixId]);

  for (const item of premix.recipeItems) {
    await client.query(
      `
        INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
        VALUES ($1, $2, $3, $4)
      `,
      [premix.premixId, item.ingredientName, item.amountPerBatch, item.unit],
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    await upsertCocktail(client, velvetReve);
    await upsertPremix(client, velvetReve.premix);

    await client.query("COMMIT");
    console.log("Velvet Reve inserted/updated successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to add Velvet Reve:", error);
  process.exit(1);
});
