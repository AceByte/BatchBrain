import { Premix } from "@prisma/client";

export type PremixUsage = {
  premixId: number;
  weeklyUseLiters: number;
};

export type IngredientNeed = {
  ingredientName: string;
  unit: string;
  totalAmount: number;
};

export type PremixPlan = {
  premixId: number;
  premixName: string;
  currentLiters: number;
  thresholdLiters: number;
  targetLiters: number;
  weeklyUseLiters: number;
  projectedEndLiters: number;
  litersToProduce: number;
  batchesToMake: number;
  ingredients: IngredientNeed[];
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePremixPlan(
  premix: Premix,
  weeklyUseLiters: number,
  recipeItems: Array<{
    amountPerBatch: number;
    ingredient: { name: string; unit: string };
  }>,
): PremixPlan {
  const projectedEndLiters = premix.currentLiters - weeklyUseLiters;
  const needsPrep = projectedEndLiters < premix.thresholdLiters;
  const litersToProduce = needsPrep
    ? Math.max(0, premix.targetLiters - projectedEndLiters)
    : 0;

  const batchesToMake =
    premix.batchYieldLiters > 0
      ? Math.ceil(litersToProduce / premix.batchYieldLiters)
      : 0;

  const ingredients = recipeItems.map((item) => ({
    ingredientName: item.ingredient.name,
    unit: item.ingredient.unit,
    totalAmount: round2(item.amountPerBatch * batchesToMake),
  }));

  return {
    premixId: premix.id,
    premixName: premix.name,
    currentLiters: round2(premix.currentLiters),
    thresholdLiters: round2(premix.thresholdLiters),
    targetLiters: round2(premix.targetLiters),
    weeklyUseLiters: round2(weeklyUseLiters),
    projectedEndLiters: round2(projectedEndLiters),
    litersToProduce: round2(litersToProduce),
    batchesToMake,
    ingredients,
  };
}
