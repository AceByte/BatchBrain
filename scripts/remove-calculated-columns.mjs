import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Removing calculated columns from database...\n");

  try {
    await prisma.$transaction(async (tx) => {
      // Remove weekly_forecast from cocktails table
      console.log("- Removing weekly_forecast from cocktails...");
      await tx.$executeRawUnsafe(`
        ALTER TABLE cocktails DROP COLUMN IF EXISTS weekly_forecast;
      `);
      
      // Remove batch_yield_bottles from premixes table
      console.log("- Removing batch_yield_bottles from premixes...");
      await tx.$executeRawUnsafe(`
        ALTER TABLE premixes DROP COLUMN IF EXISTS batch_yield_bottles;
      `);

      console.log("\n✓ Successfully removed calculated columns");
      console.log("  - weekly_forecast will now be calculated from config.defaultWeeklyDrinksPerCocktail");
      console.log("  - batch_yield_bottles will now be calculated from sum of recipe items");
    });
  } catch (error) {
    console.error("Error removing columns:", error);
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
