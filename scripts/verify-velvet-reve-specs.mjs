import "dotenv/config";
import { Client } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const cocktail = await client.query(
      `
        SELECT
          c.id,
          c.name,
          c.category,
          c.glassware,
          c.technique,
          c.is_batched,
          cps.premix_note,
          cps.batch_note
        FROM cocktails c
        LEFT JOIN cocktail_premix_specs cps ON cps.cocktail_id = c.id
        WHERE c.id = 'velvet_reve'
      `,
    );

    const specs = await client.query(
      `
        SELECT ingredient, ml
        FROM cocktail_specs
        WHERE cocktail_id = 'velvet_reve'
        ORDER BY id
      `,
    );

    const premixRecipe = await client.query(
      `
        SELECT ingredient_name, amount_per_batch, unit
        FROM premix_recipe_items
        WHERE premix_id = 'velvet_reve'
        ORDER BY id
      `,
    );

    console.log(
      JSON.stringify(
        {
          cocktail: cocktail.rows[0] ?? null,
          specs: specs.rows,
          premixRecipe: premixRecipe.rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
