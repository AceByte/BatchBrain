import "dotenv/config";
import { Client } from "pg";

const cocktails = [
  {
    id: "dolce-vita",
    name: "Dolce Vita",
    category: "REGULAR",
    glassware: "Coupe glass",
    technique: "Shake and double strain",
    garnish: "Pistacio rim",
    isBatched: true,
    serveExtras: null,
    specs: [
      { ingredient: "Vodka", ml: 40 },
      { ingredient: "Frangelico", ml: 20 },
      { ingredient: "Liqour 43", ml: 15 },
      { ingredient: "Pistacio syrup", ml: 25 },
      { ingredient: "Cream", ml: 30 },
    ],
    premixSpec: {
      premixNote: "10cl Premix\n3cl Cream",
      batchNote:
        "4 parts codka\n2 parts frangelico\n1.5 parts liqour 43\n2.5 parts pistacio syrup",
    },
    premix: {
      premixId: "dolce-vita",
      name: "Dolce Vita",
      currentBottles: 0,
      thresholdBottles: 2,
      targetBottles: 6,
      recipeItems: [
        { ingredientName: "Vodka", amountPerBatch: 4, unit: "parts" },
        { ingredientName: "Frangelico", amountPerBatch: 2, unit: "parts" },
        { ingredientName: "Liqour 43", amountPerBatch: 1.5, unit: "parts" },
        { ingredientName: "Pistacio syrup", amountPerBatch: 2.5, unit: "parts" },
      ],
    },
  },
  {
    id: "cosgroni",
    name: "Cosgroni",
    category: "REGULAR",
    glassware: "Coupe glass",
    technique: "Shake and double strain",
    garnish: "Dried lime",
    isBatched: true,
    serveExtras: null,
    specs: [
      { ingredient: "Gin", ml: 30 },
      { ingredient: "Campari", ml: 20 },
      { ingredient: "Cranberry juice", ml: 20 },
      { ingredient: "Lime juice", ml: 20 },
      { ingredient: "Sugar syrup", ml: 20 },
      { ingredient: "Eggwhites", ml: 20 },
    ],
    premixSpec: {
      premixNote: "7cl Premix\n2cl Cranberry juice\n2cl Lime juice\n2cl Eggwhites",
      batchNote: "3 parts gin\n2 parts campari\n2 parts sugar syrup",
    },
    premix: {
      premixId: "cosgroni",
      name: "Cosgroni",
      currentBottles: 0,
      thresholdBottles: 2,
      targetBottles: 6,
      recipeItems: [
        { ingredientName: "Gin", amountPerBatch: 3, unit: "parts" },
        { ingredientName: "Campari", amountPerBatch: 2, unit: "parts" },
        { ingredientName: "Sugar syrup", amountPerBatch: 2, unit: "parts" },
      ],
    },
  },
];

async function upsertCocktail(client, cocktail) {
  await client.query(
    `
      INSERT INTO cocktails (
        id, name, category, glassware, technique, garnish, is_batched, serve_extras, updated_at
      ) VALUES (
        $1, $2, $3::"CocktailCategory", $4, $5, $6, $7, $8, NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        glassware = EXCLUDED.glassware,
        technique = EXCLUDED.technique,
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
        ON CONFLICT (cocktail_id, ingredient)
        DO UPDATE SET ml = EXCLUDED.ml
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
        ON CONFLICT (premix_id, ingredient_name)
        DO UPDATE SET
          amount_per_batch = EXCLUDED.amount_per_batch,
          unit = EXCLUDED.unit
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

    for (const cocktail of cocktails) {
      await upsertCocktail(client, cocktail);
      await upsertPremix(client, cocktail.premix);
    }

    await client.query("COMMIT");

    console.log("Specs inserted/updated for:", cocktails.map((c) => c.name).join(", "));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to add cocktail specs:", error);
  process.exit(1);
});
