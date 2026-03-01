import { CocktailCategory, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up all tables in correct order (respecting foreign keys)
  await prisma.cocktailPremixSpec.deleteMany({});
  await prisma.cocktailSpec.deleteMany({});
  await prisma.premixRecipeItem.deleteMany({});
  await prisma.stockAdjustmentLog.deleteMany({});
  await prisma.productionLog.deleteMany({});
  await prisma.cocktail.deleteMany({});
  await prisma.premix.deleteMany({});
  await prisma.appConfig.deleteMany({});

  // Create premixes with recipe items
  const sourMix = await prisma.premix.create({
    data: {
      premixId: "sour-mix",
      name: "Sour Mix",
      currentBottles: 4.2,
      thresholdBottles: 2,
      targetBottles: 8,
      recipeItems: {
        create: [
          { ingredientName: "Lime Juice", amountPerBatch: 2, unit: "parts" },
          { ingredientName: "Sugar Syrup", amountPerBatch: 1.5, unit: "parts" },
        ],
      },
    },
  });

  const gingerSyrup = await prisma.premix.create({
    data: {
      premixId: "ginger-syrup",
      name: "Ginger Syrup",
      currentBottles: 1.5,
      thresholdBottles: 1,
      targetBottles: 5,
      recipeItems: {
        create: [
          { ingredientName: "Sugar", amountPerBatch: 2, unit: "parts" },
          { ingredientName: "Ginger", amountPerBatch: 1, unit: "parts" },
          { ingredientName: "Water", amountPerBatch: 2, unit: "parts" },
        ],
      },
    },
  });

  const basilInfusion = await prisma.premix.create({
    data: {
      premixId: "basil-infusion",
      name: "Basil Infusion",
      currentBottles: 1.2,
      thresholdBottles: 0.8,
      targetBottles: 3,
      recipeItems: {
        create: [
          { ingredientName: "Gin", amountPerBatch: 2, unit: "parts" },
          { ingredientName: "Basil", amountPerBatch: 0.5, unit: "parts" },
        ],
      },
    },
  });

  // Create cocktails with their premix usage
  const cocktailData = [
    {
      id: "classic-sour",
      name: "Classic Sour",
      category: CocktailCategory.REGULAR,
      isBatched: false,
      specs: [
        { ingredient: "Bourbon", ml: 60 },
        { ingredient: "Lemon Juice", ml: 30 },
        { ingredient: "Simple Syrup", ml: 15 },
        { ingredient: "Egg White", ml: 20 },
      ],
    },
    {
      id: "mule-twist",
      name: "Mule Twist",
      category: CocktailCategory.SEASONAL,
      isBatched: false,
      specs: [
        { ingredient: "Vodka", ml: 50 },
        { ingredient: "Lime Juice", ml: 15 },
        { ingredient: "Ginger Beer", ml: 100 },
      ],
    },
    {
      id: "garden-martini",
      name: "Garden Martini",
      category: CocktailCategory.SIGNATURE,
      isBatched: false,
      specs: [
        { ingredient: "Gin", ml: 60 },
        { ingredient: "Dry Vermouth", ml: 10 },
        { ingredient: "Basil Leaves", ml: 5 },
      ],
    },
    {
      id: "house-collins",
      name: "House Collins",
      category: CocktailCategory.REGULAR,
      isBatched: false,
      specs: [
        { ingredient: "Gin", ml: 50 },
        { ingredient: "Lemon Juice", ml: 25 },
        { ingredient: "Simple Syrup", ml: 20 },
        { ingredient: "Soda Water", ml: 60 },
      ],
    },
  ];

  for (const cocktail of cocktailData) {
    await prisma.cocktail.create({
      data: {
        id: cocktail.id,
        name: cocktail.name,
        category: cocktail.category,
        isBatched: cocktail.isBatched,
        specs: {
          create: cocktail.specs,
        },
      },
    });
  }

  // Create production logs
  await prisma.productionLog.createMany({
    data: [
      {
        premixId: sourMix.premixId,
        producedBottles: 4,
        productionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Weekly batch",
      },
      {
        premixId: gingerSyrup.premixId,
        producedBottles: 5,
        productionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "Prep shift",
      },
    ],
  });

  // Create stock adjustment logs
  await prisma.stockAdjustmentLog.createMany({
    data: [
      {
        premixId: sourMix.premixId,
        premixName: sourMix.name,
        oldValue: 4.7,
        newValue: 4.2,
        delta: -0.5,
        reason: "Spillage",
      },
      {
        premixId: basilInfusion.premixId,
        premixName: basilInfusion.name,
        oldValue: 0.7,
        newValue: 1.2,
        delta: 0.5,
        reason: "Inventory correction",
      },
    ],
  });

  // Create app config
  await prisma.appConfig.createMany({
    data: [
      { key: "defaultWeeklyDrinksPerCocktail", value: 10 },
      { key: "mlPerBottle", value: 750 },
    ],
  });

  console.log("✓ Seed data created successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

