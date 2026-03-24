import "dotenv/config";
import { Client } from "pg";

const IDS = ["dolce-vita", "cosgroni"];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const cocktails = await client.query(
      `SELECT id, name, category, glassware, technique, garnish, is_batched FROM cocktails WHERE id = ANY($1::text[]) ORDER BY id`,
      [IDS],
    );

    const specs = await client.query(
      `SELECT cocktail_id, ingredient, ml FROM cocktail_specs WHERE cocktail_id = ANY($1::text[]) ORDER BY cocktail_id, id`,
      [IDS],
    );

    const premixSpecs = await client.query(
      `SELECT cocktail_id, premix_note, batch_note FROM cocktail_premix_specs WHERE cocktail_id = ANY($1::text[]) ORDER BY cocktail_id`,
      [IDS],
    );

    const premixes = await client.query(
      `SELECT premix_id, name, current_bottles, threshold_bottles, target_bottles FROM premixes WHERE premix_id = ANY($1::text[]) ORDER BY premix_id`,
      [IDS],
    );

    const recipeItems = await client.query(
      `SELECT premix_id, ingredient_name, amount_per_batch, unit FROM premix_recipe_items WHERE premix_id = ANY($1::text[]) ORDER BY premix_id, id`,
      [IDS],
    );

    console.log(JSON.stringify({
      cocktails: cocktails.rows,
      cocktail_specs: specs.rows,
      cocktail_premix_specs: premixSpecs.rows,
      premixes: premixes.rows,
      premix_recipe_items: recipeItems.rows,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
