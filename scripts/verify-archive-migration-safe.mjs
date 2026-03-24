import "dotenv/config";
import { Client } from "pg";

const IDS = ["smackery", "naughty-and-nice", "nutcrackers-sour", "ernst-cardamom-syrup"];

async function count(client, sql, params) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const summary = {
      live: {
        cocktails: await count(client, "SELECT COUNT(*)::int AS count FROM cocktails WHERE id = ANY($1::text[])", [IDS]),
        cocktail_specs: await count(client, "SELECT COUNT(*)::int AS count FROM cocktail_specs WHERE cocktail_id = ANY($1::text[])", [IDS]),
        cocktail_premix_specs: await count(client, "SELECT COUNT(*)::int AS count FROM cocktail_premix_specs WHERE cocktail_id = ANY($1::text[])", [IDS]),
        premix_recipe_items: await count(client, "SELECT COUNT(*)::int AS count FROM premix_recipe_items WHERE premix_id = ANY($1::text[])", [IDS]),
        premixes: await count(client, "SELECT COUNT(*)::int AS count FROM premixes WHERE premix_id = ANY($1::text[])", [IDS]),
        stock_adjustment_logs: await count(client, "SELECT COUNT(*)::int AS count FROM stock_adjustment_logs WHERE premix_id = ANY($1::text[])", [IDS]),
        production_logs: await count(client, "SELECT COUNT(*)::int AS count FROM production_logs WHERE premix_id = ANY($1::text[])", [IDS]),
      },
      archived: {
        archived_cocktails: await count(client, "SELECT COUNT(*)::int AS count FROM archived_cocktails WHERE id = ANY($1::text[])", [IDS]),
        archived_cocktail_specs: await count(client, "SELECT COUNT(*)::int AS count FROM archived_cocktail_specs WHERE cocktail_id = ANY($1::text[])", [IDS]),
        archived_cocktail_premix_specs: await count(client, "SELECT COUNT(*)::int AS count FROM archived_cocktail_premix_specs WHERE cocktail_id = ANY($1::text[])", [IDS]),
        archived_premix_recipe_items: await count(client, "SELECT COUNT(*)::int AS count FROM archived_premix_recipe_items WHERE premix_id = ANY($1::text[])", [IDS]),
        archived_premixes: await count(client, "SELECT COUNT(*)::int AS count FROM archived_premixes WHERE premix_id = ANY($1::text[])", [IDS]),
        archived_stock_adjustment_logs: await count(client, "SELECT COUNT(*)::int AS count FROM archived_stock_adjustment_logs WHERE premix_id = ANY($1::text[])", [IDS]),
        archived_production_logs: await count(client, "SELECT COUNT(*)::int AS count FROM archived_production_logs WHERE premix_id = ANY($1::text[])", [IDS]),
      },
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
