import { sql } from "@/lib/legacy-db";
import { round2 } from "@/lib/prep-plan";

type LegacyCocktail = {
  cocktailId: string;
  name: string | null;
  tag: string | null;
  glassware: string | null;
  technique: string | null;
  straining: string | null;
  garnish: string | null;
  is_batched: boolean | null;
  serve_extras: string | null;
};

type LegacySpec = {
  cocktail_id: string;
  ingredient: string | null;
  ml: number | null;
};

type LegacyBatchRecipe = {
  cocktail_id: string;
  ingredient: string | null;
  parts: number | null;
};

type LegacyInventory = {
  cocktailId: string;
  name: string | null;
  count: number | null;
  threshold: number | null;
};

export async function getDashboardData() {
  const [cocktails, specs, batches, inventory] =
    await Promise.all([
      sql`SELECT "cocktailId", name, tag, glassware, technique, straining, garnish, is_batched, serve_extras FROM cocktails ORDER BY name ASC`,
      sql`SELECT cocktail_id, ingredient, ml FROM cocktail_specs`,
      sql`SELECT cocktail_id, ingredient, parts FROM batch_recipes`,
      sql`SELECT "cocktailId", name, count, threshold FROM inventory ORDER BY name ASC`,
    ]) as [LegacyCocktail[], LegacySpec[], LegacyBatchRecipe[], LegacyInventory[]];

  const specsByCocktail = new Map<string, LegacySpec[]>();
  for (const row of specs) {
    const key = row.cocktail_id;
    const arr = specsByCocktail.get(key) ?? [];
    arr.push(row);
    specsByCocktail.set(key, arr);
  }

  const batchesByCocktail = new Map<string, LegacyBatchRecipe[]>();
  for (const row of batches) {
    const key = row.cocktail_id;
    const arr = batchesByCocktail.get(key) ?? [];
    arr.push(row);
    batchesByCocktail.set(key, arr);
  }

  const premixes = inventory.map((row, index) => {
    const batchRows = batchesByCocktail.get(row.cocktailId) ?? [];
    // Deduplicate recipe items by ingredient name
    const uniqueRecipeMap = new Map<string, { ingredientName: string; amountPerBatch: number; unit: string }>();
    for (const item of batchRows) {
      const ingredientName = item.ingredient ?? "Unknown";
      if (!uniqueRecipeMap.has(ingredientName)) {
        uniqueRecipeMap.set(ingredientName, {
          ingredientName,
          amountPerBatch: Number(item.parts ?? 0),
          unit: "parts",
        });
      }
    }
    const recipeItems = Array.from(uniqueRecipeMap.values());

    const batchYieldLiters = Math.max(
      1,
      recipeItems.reduce((sum, item) => sum + item.amountPerBatch, 0),
    );

    const thresholdBottles = Number(row.threshold ?? 2);
    const currentBottles = Number(row.count ?? 0);
    const targetBottles = thresholdBottles + batchYieldLiters;
    
    // Calculate weekly usage: sum up all cocktails that use this premix
    // For each cocktail, calculate (ml per drink * weekly forecast) / 750ml per bottle
    const premixName = row.name ?? row.cocktailId;
    let weeklyUseBottles = 0;
    
    for (const [cocktailId, specs] of specsByCocktail.entries()) {
      // Find if this cocktail uses this premix
      const usesThisPremix = specs.some(spec => spec.ingredient === premixName);
      if (usesThisPremix) {
        // Get the cocktail info to find weekly forecast
        const cocktail = cocktails.find(c => c.cocktailId === cocktailId);
        if (cocktail) {
          // Each cocktail uses some ml of this premix
          const mlUsed = specs
            .filter(spec => spec.ingredient === premixName)
            .reduce((sum, spec) => sum + Number(spec.ml ?? 0), 0);
          
          // Assume a modest weekly forecast of 10 drinks per cocktail if not specified
          const weeklyForecast = 10;
          const totalMlPerWeek = mlUsed * weeklyForecast;
          const bottlesPerWeek = totalMlPerWeek / 750; // Standard bottle is 750ml
          weeklyUseBottles += bottlesPerWeek;
        }
      }
    }
    
    weeklyUseBottles = Math.round(weeklyUseBottles * 100) / 100; // Round to 2 decimals
    const projectedEndBottles = currentBottles - weeklyUseBottles;
    const bottlesToProduce =
      projectedEndBottles < thresholdBottles ? targetBottles - projectedEndBottles : 0;
    const batchesToMake = Math.max(0, Math.ceil(bottlesToProduce / batchYieldLiters));

    return {
      id: index + 1,
      sourceCocktailId: row.cocktailId,
      name: row.name ?? row.cocktailId,
      currentBottles,
      thresholdBottles,
      targetBottles,
      batchYieldBottles: batchYieldLiters,
      recipeItems,
      weeklyUseBottles,
      projectedEndBottles,
      bottlesToProduce,
      batchesToMake,
    };
  });

  const prepPlan = premixes.map((premix) => ({
    premixId: premix.id,
    premixName: premix.name,
    currentBottles: round2(premix.currentBottles),
    thresholdBottles: round2(premix.thresholdBottles),
    targetBottles: round2(premix.targetBottles),
    weeklyUseBottles: round2(premix.weeklyUseBottles),
    projectedEndBottles: round2(premix.projectedEndBottles),
    bottlesToProduce: round2(premix.bottlesToProduce),
    batchesToMake: premix.batchesToMake,
    ingredients: premix.recipeItems.map((item) => ({
      ingredientName: item.ingredientName,
      unit: item.unit,
      totalAmount: round2(item.amountPerBatch * premix.batchesToMake),
    })),
  }));

  const ingredientTotals = prepPlan.reduce<
    Record<string, { ingredientName: string; unit: string; totalAmount: number }>
  >((acc, premixItem) => {
    for (const ingredient of premixItem.ingredients) {
      const key = `${ingredient.ingredientName}:${ingredient.unit}`;
      if (!acc[key]) {
        acc[key] = { ...ingredient };
      } else {
        acc[key].totalAmount += ingredient.totalAmount;
      }
    }

    return acc;
  }, {});

  return {
    premixes: premixes.map((premix) => ({
      id: premix.id,
      name: premix.name,
      currentBottles: round2(premix.currentBottles),
      thresholdBottles: round2(premix.thresholdBottles),
      targetBottles: round2(premix.targetBottles),
      batchYieldBottles: round2(premix.batchYieldBottles),
      recipeItems: premix.recipeItems.map((item) => ({
        ingredientName: item.ingredientName,
        amountPerBatch: item.amountPerBatch,
        unit: item.unit,
      })),
    })),
    cocktails: cocktails.map((cocktail, index) => ({
      id: index + 1,
      name: cocktail.name ?? cocktail.cocktailId,
      category:
        cocktail.tag?.toUpperCase() === "SEASONAL"
          ? "SEASONAL"
          : cocktail.tag?.toUpperCase() === "SIGNATURE"
            ? "SIGNATURE"
            : "REGULAR",
      glassware: cocktail.glassware,
      technique: cocktail.technique,
      straining: cocktail.straining,
      garnish: cocktail.garnish,
      isBatched: cocktail.is_batched ?? false,
      serveExtras: cocktail.serve_extras,
      premixItems: (() => {
        // Deduplicate premix items by premix name
        const specs = specsByCocktail.get(cocktail.cocktailId) ?? [];
        const uniqueSpecsMap = new Map<string, { premixName: string; amountPerDrinkMl: number }>();
        for (const item of specs) {
          const premixName = item.ingredient ?? "Unknown";
          if (!uniqueSpecsMap.has(premixName)) {
            uniqueSpecsMap.set(premixName, {
              premixName,
              amountPerDrinkMl: Number(item.ml ?? 0),
            });
          }
        }
        return Array.from(uniqueSpecsMap.values());
      })(),
    })),
    prepPlan,
    ingredientTotals: Object.values(ingredientTotals)
      .map((item) => ({ ...item, totalAmount: round2(item.totalAmount) }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
  };
}
