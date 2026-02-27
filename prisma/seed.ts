import { CocktailCategory, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.stockEvent.deleteMany({});
  await prisma.cocktailPremix.deleteMany({});
  await prisma.premixIngredient.deleteMany({});
  await prisma.cocktail.deleteMany({});
  await prisma.premix.deleteMany({});
  await prisma.ingredient.deleteMany({});

  const [vodka, gin, limeJuice, sugar, ginger, basil] = await Promise.all([
    prisma.ingredient.create({ data: { name: "Vodka", unit: "ml" } }),
    prisma.ingredient.create({ data: { name: "Gin", unit: "ml" } }),
    prisma.ingredient.create({ data: { name: "Lime Juice", unit: "ml" } }),
    prisma.ingredient.create({ data: { name: "Sugar", unit: "g" } }),
    prisma.ingredient.create({ data: { name: "Ginger", unit: "g" } }),
    prisma.ingredient.create({ data: { name: "Basil", unit: "g" } }),
  ]);

  const sourMix = await prisma.premix.create({
    data: {
      name: "Sour Mix",
      currentLiters: 3.2,
      thresholdLiters: 2,
      targetLiters: 8,
      batchYieldLiters: 4,
      recipeItems: {
        create: [
          { ingredientId: limeJuice.id, amountPerBatch: 2000 },
          { ingredientId: sugar.id, amountPerBatch: 1200 },
        ],
      },
    },
  });

  const gingerSyrup = await prisma.premix.create({
    data: {
      name: "Ginger Syrup",
      currentLiters: 1.1,
      thresholdLiters: 1,
      targetLiters: 5,
      batchYieldLiters: 2,
      recipeItems: {
        create: [
          { ingredientId: sugar.id, amountPerBatch: 900 },
          { ingredientId: ginger.id, amountPerBatch: 350 },
        ],
      },
    },
  });

  const basilInfusion = await prisma.premix.create({
    data: {
      name: "Basil Infusion",
      currentLiters: 0.8,
      thresholdLiters: 0.6,
      targetLiters: 2,
      batchYieldLiters: 1,
      recipeItems: {
        create: [
          { ingredientId: gin.id, amountPerBatch: 700 },
          { ingredientId: basil.id, amountPerBatch: 80 },
        ],
      },
    },
  });

  const cocktailData = [
    {
      name: "Classic Sour",
      category: CocktailCategory.REGULAR,
      weeklyForecast: 60,
      premixRefs: [{ premixId: sourMix.id, amountPerDrinkMl: 80 }],
    },
    {
      name: "Mule Twist",
      category: CocktailCategory.SEASONAL,
      weeklyForecast: 40,
      premixRefs: [{ premixId: gingerSyrup.id, amountPerDrinkMl: 35 }],
    },
    {
      name: "Garden Martini",
      category: CocktailCategory.SIGNATURE,
      weeklyForecast: 30,
      premixRefs: [{ premixId: basilInfusion.id, amountPerDrinkMl: 25 }],
    },
    {
      name: "House Collins",
      category: CocktailCategory.REGULAR,
      weeklyForecast: 55,
      premixRefs: [
        { premixId: sourMix.id, amountPerDrinkMl: 55 },
        { premixId: gingerSyrup.id, amountPerDrinkMl: 15 },
      ],
    },
  ];

  for (const cocktail of cocktailData) {
    await prisma.cocktail.create({
      data: {
        name: cocktail.name,
        category: cocktail.category,
        weeklyForecast: cocktail.weeklyForecast,
        premixItems: {
          create: cocktail.premixRefs,
        },
      },
    });
  }

  await prisma.stockEvent.createMany({
    data: [
      {
        premixId: sourMix.id,
        deltaLiters: -0.6,
        note: "Weekly usage",
      },
      {
        premixId: gingerSyrup.id,
        deltaLiters: 2,
        note: "Prep shift batch",
      },
      {
        premixId: basilInfusion.id,
        deltaLiters: -0.4,
        note: "Service usage",
      },
    ],
  });
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
