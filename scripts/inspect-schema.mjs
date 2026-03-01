import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);

  const byTable = {};
  for (const col of columns) {
    if (!byTable[col.table_name]) byTable[col.table_name] = [];
    byTable[col.table_name].push(col);
  }

  const idxByTable = {};
  for (const idx of indexes) {
    if (!idxByTable[idx.tablename]) idxByTable[idx.tablename] = [];
    idxByTable[idx.tablename].push(idx);
  }

  for (const tableName of Object.keys(byTable)) {
    console.log(`\n${tableName}`);
    for (const col of byTable[tableName]) {
      const nullable = col.is_nullable === "NO" ? " NOT NULL" : "";
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : "";
      console.log(`  ${col.column_name}: ${col.data_type}${nullable}${def}`);
    }

    const tableIndexes = idxByTable[tableName] ?? [];
    if (tableIndexes.length > 0) {
      console.log("  Indexes:");
      for (const idx of tableIndexes) {
        console.log(`    - ${idx.indexname}: ${idx.indexdef}`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
