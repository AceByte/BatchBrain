import "dotenv/config";
import { Client } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE cocktails SET garnish = 'Pistachio rim', updated_at = NOW() WHERE id = 'dolce-vita'`,
    );

    await client.query(
      `
        UPDATE cocktail_specs
        SET ingredient = CASE
          WHEN ingredient = 'Liqour 43' THEN 'Liqueur 43'
          WHEN ingredient = 'Pistacio syrup' THEN 'Pistachio syrup'
          WHEN ingredient = 'Eggwhites' THEN 'Egg whites'
          ELSE ingredient
        END
        WHERE cocktail_id IN ('dolce-vita', 'cosgroni')
      `,
    );

    await client.query(
      `
        UPDATE premix_recipe_items
        SET ingredient_name = CASE
          WHEN ingredient_name = 'Liqour 43' THEN 'Liqueur 43'
          WHEN ingredient_name = 'Pistacio syrup' THEN 'Pistachio syrup'
          ELSE ingredient_name
        END
        WHERE premix_id IN ('dolce-vita', 'cosgroni')
      `,
    );

    await client.query(
      `
        UPDATE cocktail_premix_specs
        SET
          premix_note = REPLACE(
            REPLACE(premix_note, 'Eggwhites', 'Egg whites'),
            'Cranberry juice',
            'Cranberry juice'
          ),
          batch_note = REPLACE(
            REPLACE(
              REPLACE(batch_note, 'codka', 'vodka'),
              'liqour 43',
              'liqueur 43'
            ),
            'pistacio syrup',
            'pistachio syrup'
          ),
          updated_at = NOW()
        WHERE cocktail_id IN ('dolce-vita', 'cosgroni')
      `,
    );

    await client.query("COMMIT");
    console.log("Normalized text values for Dolce Vita and Cosgroni.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Normalization failed:", error);
  process.exit(1);
});
