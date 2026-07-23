export type DashboardView = "cocktails" | "inventory" | "prep" | "archive";

export type DashboardData = {
  premixes: Array<{
    id: number;
    sourceCocktailId: string;
    name: string;
    isArchived: boolean;
    currentBottles: number;
    thresholdBottles: number;
    targetBottles: number;
    batchYieldBottles: number;
    recipeItems: Array<{
      ingredientName: string;
      amountPerBatch: number;
      unit: string;
    }>;
  }>;
  cocktails: Array<{
    id: number;
    sourceCocktailId: string;
    name: string;
    isArchived: boolean;
    category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
    glassware: string | null;
    technique: string | null;
    straining: string | null;
    garnish: string | null;
    isBatched: boolean;
    serveExtras: string | null;
    premixNote: string | null;
    batchNote: string | null;
    specs: Array<{
      ingredient: string;
      ml: number;
    }>;
  }>;
  prepPlan: Array<{
    premixId: number;
    premixName: string;
    currentBottles: number;
    thresholdBottles: number;
    targetBottles: number;
    weeklyUseBottles: number;
    projectedEndBottles: number;
    bottlesToProduce: number;
    batchesToMake: number;
    ingredients: Array<{
      ingredientName: string;
      unit: string;
      totalAmount: number;
    }>;
  }>;
  ingredientTotals: Array<{
    ingredientName: string;
    unit: string;
    totalAmount: number;
  }>;
};

export type EditingCocktail = {
  id: number;
  sourceCocktailId: string;
  name: string;
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
  glassware: string | null;
  technique: string | null;
  straining: string | null;
  garnish: string | null;
  isBatched: boolean;
  serveExtras: string | null;
  premixNote: string | null;
  batchNote: string | null;
  specs: Array<{
    ingredient: string;
    ml: number;
  }>;
};

export type EditingPremix = {
  id: number;
  sourceCocktailId: string;
  name: string;
  currentBottles: number;
  thresholdBottles: number;
  targetBottles: number;
  batchYieldBottles: number;
  recipeItems: Array<{
    ingredientName: string;
    amountPerBatch: number;
    unit: string;
  }>;
};

export type AddCocktailForm = {
  name: string;
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
  glassware: string;
  technique: string;
  straining: string;
  garnish: string;
  isBatched: boolean;
  serveExtras: string;
  premixNote: string;
  batchNote: string;
  specs: Array<{
    ingredient: string;
    ml: number;
  }>;
  createPremix: boolean;
  premixCurrentBottles: number;
  premixThresholdBottles: number;
  premixTargetBottles: number;
  premixRecipeItems: Array<{
    ingredientName: string;
    amountPerBatch: number;
    unit: string;
  }>;
};

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

export type UndoAdjustment = {
  expiresAt: number;
  changes: Array<{
    id: number;
    oldValue: number;
    newValue: number;
  }>;
};
