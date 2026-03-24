import "dotenv/config";
import { Client } from "pg";

const TABLES = [
  "archived_cocktails",
  "archived_cocktail_specs",
  "archived_cocktail_premix_specs",
  "archived_premix_recipe_items",
  "archived_premixes",
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const table of TABLES) {
      const exists = await client.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
        `,
        [table],
      );

      if (!exists.rows[0]?.exists) {
        console.log(`\n${table}: does not exist`);
        continue;
      }

      const columns = await client.query(
        `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
        `,
        [table],
      );

      console.log(`\n${table}:`);
      for (const col of columns.rows) {
        console.log(`- ${col.column_name} (${col.data_type})`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
