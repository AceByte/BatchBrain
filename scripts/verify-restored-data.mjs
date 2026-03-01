import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function count(tableName) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return rows[0]?.count ?? 0;
}

async function main() {
  const tables = [
    "cocktails",
    "premixes",
    "premix_recipe_items",
    "cocktail_premix_specs",
    "cocktail_premix_usage",
    "app_config",
    "production_logs",
    "stock_adjustment_logs",
  ];

  for (const table of tables) {
    console.log(`${table}: ${await count(table)}`);
  }

  const orphanUsage = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM cocktail_premix_usage u
    LEFT JOIN cocktails c ON c.id = u.cocktail_id
    LEFT JOIN premixes p ON p.premix_id = u.premix_id
    WHERE c.id IS NULL OR p.premix_id IS NULL
  `);

  const orphanRecipe = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM premix_recipe_items r
    LEFT JOIN premixes p ON p.premix_id = r.premix_id
    WHERE p.premix_id IS NULL
  `);

  console.log(`orphan_usage: ${orphanUsage[0]?.count ?? 0}`);
  console.log(`orphan_recipe: ${orphanRecipe[0]?.count ?? 0}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
