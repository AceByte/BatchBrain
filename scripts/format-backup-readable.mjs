import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const backupFile = process.argv[2] || "backups/db-backup-2026-03-06T00-56-04-719Z.json";
const backup = JSON.parse(readFileSync(backupFile, "utf8"));

// Helper to convert Decimal format to readable number
function toNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && val.d && Array.isArray(val.d)) {
    return val.d[0]; // Extract the actual value from Decimal format
  }
  return val;
}

let output = [];

output.push("═══════════════════════════════════════════════════════════════");
output.push(`DATABASE BACKUP - ${backup.meta.createdAt}`);
output.push(`Schema: ${backup.meta.databaseSchema} | Tables: ${backup.meta.tableCount}`);
output.push("═══════════════════════════════════════════════════════════════\n");

// Build lookup maps
const cocktails = backup.tables.cocktails.rows;
const specs = backup.tables.cocktail_specs.rows;
const premixSpecs = backup.tables.cocktail_premix_specs.rows;
const premixes = backup.tables.premixes.rows;
const recipeItems = backup.tables.premix_recipe_items.rows;
const productionLogs = backup.tables.production_logs.rows;
const stockAdjustments = backup.tables.stock_adjustment_logs.rows;
const config = backup.tables.app_config.rows;

// COCKTAILS SECTION
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
output.push(`COCKTAILS (${cocktails.length})`);
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

cocktails.forEach((cocktail) => {
  output.push(`🍹 ${cocktail.name.toUpperCase()}`);
  output.push(`   ID: ${cocktail.id}`);
  output.push(`   Category: ${cocktail.category}`);
  if (cocktail.glassware) output.push(`   Glassware: ${cocktail.glassware}`);
  if (cocktail.technique) output.push(`   Technique: ${cocktail.technique}`);
  if (cocktail.straining) output.push(`   Straining: ${cocktail.straining}`);
  if (cocktail.garnish) output.push(`   Garnish: ${cocktail.garnish}`);
  if (cocktail.serve_extras) output.push(`   Serve Extras: ${cocktail.serve_extras}`);
  output.push(`   Batched: ${cocktail.is_batched ? "Yes" : "No"}`);
  
  // Add specs for this cocktail
  const cocktailSpecs = specs.filter(s => s.cocktail_id === cocktail.id);
  if (cocktailSpecs.length > 0) {
    output.push(`   Ingredients:`);
    cocktailSpecs.forEach(spec => {
      const ml = toNumber(spec.ml);
      output.push(`     • ${spec.ingredient}: ${ml}ml`);
    });
  }
  
  // Add premix spec for this cocktail
  const premixSpec = premixSpecs.find(ps => ps.cocktail_id === cocktail.id);
  if (premixSpec) {
    output.push(`   Premix:`);
    if (premixSpec.premix_note) output.push(`     • Note: ${premixSpec.premix_note.replace(/\n/g, "\n              ")}`);
    if (premixSpec.batch_note) output.push(`     • Batch Note: ${premixSpec.batch_note}`);
  }
  
  output.push("");
});

// PREMIXES SECTION
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
output.push(`PREMIXES (${premixes.length})`);
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

premixes.forEach((premix) => {
  output.push(`🧴 ${premix.name.toUpperCase()}`);
  output.push(`   ID: ${premix.premix_id}`);
  const current = toNumber(premix.current_bottles);
  const threshold = toNumber(premix.threshold_bottles);
  const target = toNumber(premix.target_bottles);
  output.push(`   Current Bottles: ${current}`);
  output.push(`   Threshold: ${threshold} | Target: ${target}`);
  
  // Add recipe items for this premix
  const items = recipeItems.filter(ri => ri.premix_id === premix.premix_id);
  if (items.length > 0) {
    output.push(`   Recipe:`);
    items.forEach(item => {
      const amount = toNumber(item.amount_per_batch);
      output.push(`     • ${item.ingredient_name}: ${amount} ${item.unit}`);
    });
  }
  
  // Add recent production logs
  const logs = productionLogs.filter(pl => pl.premix_id === premix.premix_id);
  if (logs.length > 0) {
    output.push(`   Recent Production:`);
    logs.slice(-5).reverse().forEach(log => {
      const bottles = toNumber(log.produced_bottles);
      output.push(`     • ${log.production_date}: ${bottles} bottles${log.notes ? ` (${log.notes})` : ""}`);
    });
  }
  
  // Add recent stock adjustments
  const adjustments = stockAdjustments.filter(sa => sa.premix_id === premix.premix_id);
  if (adjustments.length > 0) {
    output.push(`   Recent Adjustments:`);
    adjustments.slice(-3).reverse().forEach(adj => {
      const oldVal = toNumber(adj.old_value);
      const newVal = toNumber(adj.new_value);
      output.push(`     • ${oldVal} → ${newVal}${adj.notes ? `: ${adj.notes}` : ""}`);
    });
  }
  
  output.push("");
});

// CONFIG SECTION
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
output.push(`APP CONFIG`);
output.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

config.forEach((item) => {
  output.push(`${item.key}: ${typeof item.value === 'object' ? JSON.stringify(item.value) : item.value}`);
});

output.push("\n");

const text = output.join("\n");
const outputPath = backupFile.replace(".json", "-readable.txt");
writeFileSync(outputPath, text, "utf8");

console.log(`✓ Readable backup saved to: ${outputPath}`);
console.log(`\nPreview:\n`);
console.log(text.slice(0, 1500) + "\n... (see file for full content)");
