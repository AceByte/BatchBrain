import { sql } from "@/lib/legacy-db";
import { getWeeklyUsage } from "@/lib/production";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type DbCocktail = {
  id: string;
  name: string | null;
  category: string | null;
  glassware: string | null;
  technique: string | null;
  straining: string | null;
  garnish: string | null;
  is_batched: boolean;
  serve_extras: string | null;
};

type DbCocktailSpec = {
  cocktail_id: string;
  ingredient: string | null;
  ml: number | null;
};

type DbPremixSpec = {
  cocktail_id: string;
  premix_note: string | null;
  batch_note: string | null;
};

type DbRecipeItem = {
  premix_id: string;
  ingredient_name: string | null;
  amount_per_batch: number | null;
  unit: string | null;
};

type DbPremix = {
  premix_id: string;
  name: string | null;
  current_bottles: number | null;
  threshold_bottles: number | null;
  target_bottles: number | null;
};

// Load dashboard and archive data
export async function getDashboardData() {
  const weeklyUsageFromHistory = await getWeeklyUsage(4);

  const [
    cocktails,
    cocktailSpecs,
    premixSpecs,
    recipeRows,
    premixes,
    archivedCocktails,
    archivedCocktailSpecs,
    archivedPremixSpecs,
    archivedRecipeRows,
    archivedPremixes,
  ] =
    await Promise.all([
      sql`SELECT id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras FROM cocktails ORDER BY name ASC`,
      sql`SELECT cocktail_id, ingredient, ml FROM cocktail_specs`,
      sql`SELECT cocktail_id, premix_note, batch_note FROM cocktail_premix_specs`,
      sql`SELECT premix_id, ingredient_name, amount_per_batch, unit FROM premix_recipe_items`,
      sql`SELECT premix_id, name, current_bottles, threshold_bottles, target_bottles FROM premixes ORDER BY name ASC`,
      sql`SELECT id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras FROM archived_cocktails ORDER BY name ASC`,
      sql`SELECT cocktail_id, ingredient, ml FROM archived_cocktail_specs`,
      sql`SELECT cocktail_id, premix_note, batch_note FROM archived_cocktail_premix_specs`,
      sql`SELECT premix_id, ingredient_name, amount_per_batch, unit FROM archived_premix_recipe_items`,
      sql`SELECT premix_id, name, current_bottles, threshold_bottles, target_bottles FROM archived_premixes ORDER BY name ASC`,
    ]) as [
      DbCocktail[],
      DbCocktailSpec[],
      DbPremixSpec[],
      DbRecipeItem[],
      DbPremix[],
      DbCocktail[],
      DbCocktailSpec[],
      DbPremixSpec[],
      DbRecipeItem[],
      DbPremix[],
    ];

  const archivedCocktailIdSet = new Set(archivedCocktails.map((row) => row.id));

  // Group cocktail specs by cocktail_id
  const specsByCocktailId = new Map<string, DbCocktailSpec[]>();
  for (const row of [...cocktailSpecs, ...archivedCocktailSpecs]) {
    const key = row.cocktail_id;
    const arr = specsByCocktailId.get(key) ?? [];
    arr.push(row);
    specsByCocktailId.set(key, arr);
  }

  // Map premix specs by cocktail_id
  const premixSpecByCocktailId = new Map<string, DbPremixSpec>();
  for (const row of [...premixSpecs, ...archivedPremixSpecs]) {
    premixSpecByCocktailId.set(row.cocktail_id, row);
  }

  // Group recipe items by premix_id
  const recipesByPremix = new Map<string, DbRecipeItem[]>();
  for (const row of [...recipeRows, ...archivedRecipeRows]) {
    const key = row.premix_id;
    const arr = recipesByPremix.get(key) ?? [];
    arr.push(row);
    recipesByPremix.set(key, arr);
  }

  // Process premixes
  const buildPremixList = (rows: DbPremix[], isArchived: boolean, startIndex: number) => rows.map((row, index) => {
    const recipeRowsForPremix = recipesByPremix.get(row.premix_id) ?? [];
    // Deduplicate recipe items by ingredient name
    const uniqueRecipeMap = new Map<string, { ingredientName: string; amountPerBatch: number; unit: string }>();
    for (const item of recipeRowsForPremix) {
      const ingredientName = item.ingredient_name ?? "Unknown";
      if (!uniqueRecipeMap.has(ingredientName)) {
        uniqueRecipeMap.set(ingredientName, {
          ingredientName,
          amountPerBatch: Number(item.amount_per_batch ?? 0),
          unit: item.unit ?? "parts",
        });
      }
    }
    const recipeItems = Array.from(uniqueRecipeMap.values());

    // Calculate batch yield from recipe items
    const batchYieldBottles = Math.max(
      1,
      recipeItems.reduce((sum, item) => sum + item.amountPerBatch, 0),
    );

    const thresholdBottles = Number(row.threshold_bottles ?? 2);
    const currentBottles = Number(row.current_bottles ?? 0);
    const targetBottles = Number(row.target_bottles ?? thresholdBottles + batchYieldBottles);
    
    // Calculate weekly usage: use historical data if available
    const premixId = row.premix_id;
    let weeklyUseBottles = weeklyUsageFromHistory.get(premixId) ?? 0;
    
    weeklyUseBottles = Math.round(weeklyUseBottles * 100) / 100; // Round to 2 decimals
    const projectedEndBottles = currentBottles - weeklyUseBottles;
    const bottlesToProduce =
      projectedEndBottles < thresholdBottles ? targetBottles - projectedEndBottles : 0;
    const batchesToMake = Math.max(0, Math.ceil(bottlesToProduce / batchYieldBottles));

    return {
      id: startIndex + index + 1,
      sourceCocktailId: row.premix_id,
      name: row.name ?? row.premix_id,
      isArchived,
      currentBottles,
      thresholdBottles,
      targetBottles,
      batchYieldBottles,
      recipeItems,
      weeklyUseBottles,
      projectedEndBottles,
      bottlesToProduce,
      batchesToMake,
    };
  });

  const activePremixList = buildPremixList(premixes, false, 0);
  const archivedPremixList = buildPremixList(archivedPremixes, true, activePremixList.length);
  const premixList = [...activePremixList, ...archivedPremixList];

  const prepPlan = activePremixList.map((premix) => ({
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
    // Only include ingredients for items that actually need prep
    if (premixItem.batchesToMake > 0) {
      for (const ingredient of premixItem.ingredients) {
        const key = `${ingredient.ingredientName}:${ingredient.unit}`;
        if (!acc[key]) {
          acc[key] = { ...ingredient };
        } else {
          acc[key].totalAmount += ingredient.totalAmount;
        }
      }
    }

    return acc;
  }, {});

  return {
    premixes: premixList.map((premix) => ({
      id: premix.id,
      sourceCocktailId: premix.sourceCocktailId,
      name: premix.name,
      isArchived: premix.isArchived,
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
    cocktails: [...cocktails, ...archivedCocktails].map((cocktail, index) => {
      const specs = specsByCocktailId.get(cocktail.id) ?? [];
      const premixSpec = premixSpecByCocktailId.get(cocktail.id);
      const isArchived = archivedCocktailIdSet.has(cocktail.id);
      return {
        id: index + 1,
        sourceCocktailId: cocktail.id,
        name: cocktail.name ?? cocktail.id,
        isArchived,
        category:
          cocktail.category?.toUpperCase() === "SEASONAL"
            ? "SEASONAL"
            : cocktail.category?.toUpperCase() === "SIGNATURE"
              ? "SIGNATURE"
              : cocktail.category?.toUpperCase() === "INGREDIENTS"
                ? "INGREDIENTS"
                : "REGULAR",

        glassware: cocktail.glassware,
        technique: cocktail.technique,
        straining: cocktail.straining,
        garnish: cocktail.garnish,
        isBatched: cocktail.is_batched,
        serveExtras: cocktail.serve_extras,
        premixNote: premixSpec?.premix_note ?? null,
        batchNote: premixSpec?.batch_note ?? null,
        specs: specs.map((spec) => ({
          ingredient: spec.ingredient ?? "Unknown",
          ml: Number(spec.ml ?? 0),
        })),
      };
    }),
    prepPlan,
    ingredientTotals: Object.values(ingredientTotals)
      .map((item) => ({ ...item, totalAmount: round2(item.totalAmount) }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)),
  };
}
