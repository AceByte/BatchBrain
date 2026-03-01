import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing cocktail specs schema...\n");

  try {
    await prisma.$transaction(async (tx) => {
      // Drop the cocktail_premix_usage table (this was incorrectly linking cocktails to premixes)
      console.log("- Dropping cocktail_premix_usage table (if exists)...");
      await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS cocktail_premix_usage CASCADE;`);

      // Create the cocktail_specs table for non-batched cocktails
      console.log("- Creating cocktail_specs table (if not exists)...");
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS cocktail_specs (
          id BIGSERIAL PRIMARY KEY,
          cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
          ingredient TEXT NOT NULL,
          ml NUMERIC(10, 2) NOT NULL CHECK (ml > 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (cocktail_id, ingredient)
        );
      `);

      // Create the cocktail_premix_specs table for batched cocktail notes
      console.log("- Creating cocktail_premix_specs table (if not exists)...");
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS cocktail_premix_specs (
          id BIGSERIAL PRIMARY KEY,
          cocktail_id TEXT NOT NULL UNIQUE REFERENCES cocktails(id) ON DELETE CASCADE,
          premix_note TEXT,
          batch_note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      console.log("- Creating indexes...");
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_cocktail_specs_cocktail_id ON cocktail_specs(cocktail_id);
      `);
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_cocktail_premix_specs_cocktail_id ON cocktail_premix_specs(cocktail_id);
      `);

      console.log("\n✓ Successfully fixed cocktail specs schema");
      console.log("  - Removed cocktail_premix_usage (incorrectly linked cocktails to premixes)");
      console.log("  - Added/verified cocktail_specs for non-batched cocktail ingredients");
      console.log("  - Added/verified cocktail_premix_specs for batched cocktail notes");
    });
  } catch (error) {
    console.error("Error fixing schema:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
