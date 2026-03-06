import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const backupFile = process.argv[2] || "backups/db-backup-2026-03-06T00-56-04-719Z.json";
const backup = JSON.parse(readFileSync(backupFile, "utf8"));

// Create a more readable format
const formatted = {
  "=== DATABASE BACKUP SUMMARY ===": null,
  backup_created: backup.meta.createdAt,
  database_schema: backup.meta.databaseSchema,
  total_tables: backup.meta.tableCount,
  total_rows: Object.values(backup.tables).reduce((sum, t) => sum + t.rowCount, 0),
  
  "=== TABLE OVERVIEW ===": null,
  table_summary: Object.entries(backup.tables).reduce((acc, [name, data]) => {
    acc[name] = `${data.rowCount} rows`;
    return acc;
  }, {}),

  "=== TABLE DATA ===": null,
  ...Object.fromEntries(
    Object.entries(backup.tables).map(([name, data]) => [
      `TABLE: ${name}`,
      {
        row_count: data.rowCount,
        rows: data.rows,
      },
    ])
  ),
};

const outputPath = backupFile.replace(".json", "-formatted.json");
writeFileSync(outputPath, JSON.stringify(formatted, null, 2), "utf8");

console.log(`✓ Formatted backup saved to: ${outputPath}`);
console.log(`\nSummary:`);
console.log(`  Tables: ${formatted.total_tables}`);
console.log(`  Rows: ${formatted.total_rows}`);
console.log(`  Created: ${formatted.backup_created}`);
