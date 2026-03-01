import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

function toJsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonSafe(v)]));
  }
  return value;
}

async function main() {
  const startedAt = new Date();

  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tableNames = tableRows.map((row) => row.table_name);

  const backup = {
    meta: {
      createdAt: startedAt.toISOString(),
      databaseSchema: "public",
      tableCount: tableNames.length,
    },
    tables: {},
  };

  for (const tableName of tableNames) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "public"."${tableName}";`);
    backup.tables[tableName] = {
      rowCount: rows.length,
      rows: toJsonSafe(rows),
    };
  }

  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });

  const outputPath = join(backupDir, `db-backup-${stamp}.json`);
  writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf8");

  const totalRows = Object.values(backup.tables).reduce((sum, table) => sum + table.rowCount, 0);

  console.log(`Backup complete: ${outputPath}`);
  console.log(`Tables: ${backup.meta.tableCount}`);
  console.log(`Rows: ${totalRows}`);
}

main()
  .catch((error) => {
    console.error("Backup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
