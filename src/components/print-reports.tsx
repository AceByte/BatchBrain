"use client";

type DashboardData = {
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
    isBatched: boolean;
    glassware?: string;
    technique?: string;
    straining?: string;
    garnish?: string;
    specs?: Array<{ ingredient: string; ml: number }>;
    premixNote?: string | null;
    batchNote?: string | null;
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

type StockAdjustment = {
  premixId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  delta: number;
  notes: string | null;
  createdAt: string;
};

export function ChangeLogReport({
  data,
  dateRange,
}: {
  data: StockAdjustment[];
  dateRange?: { from: string; to: string };
}) {
  const now = new Date().toLocaleString();

  return (
    <div className="bg-white p-4 text-[11px] text-black">
      <div className="mb-2 text-[11px]">
        <div>Stock Adjustment Change Log</div>
        <div>Generated: {now}</div>
        {dateRange && <div>Period: {dateRange.from} to {dateRange.to}</div>}
      </div>

      <table className="w-full table-fixed border-collapse border-2 border-black">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-normal">date</th>
            <th className="border border-black p-2 text-left font-normal">premix</th>
            <th className="border border-black p-2 text-right font-normal">old</th>
            <th className="border border-black p-2 text-right font-normal">new</th>
            <th className="border border-black p-2 text-right font-normal">delta</th>
            <th className="border border-black p-2 text-left font-normal">notes</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black p-2 text-center">No adjustment records found.</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 align-top">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="border border-black p-2 align-top">{row.premixName}</td>
                <td className="border border-black p-2 text-right align-top">{row.oldValue.toFixed(2)}</td>
                <td className="border border-black p-2 text-right align-top">{row.newValue.toFixed(2)}</td>
                <td className="border border-black p-2 text-right align-top">{`${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)}`}</td>
                <td className="border border-black p-2 align-top">{row.notes || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SpecSheetReport({ data }: { data: DashboardData }) {
  const menuYear = new Date().getFullYear();
  const premixByCocktailId = new Map(
    data.premixes.map((premix) => [premix.sourceCocktailId, premix]),
  );

  const allCocktails = data.cocktails.filter((c) => !c.isArchived);

  const categoryPriority: Record<"SIGNATURE" | "SEASONAL" | "REGULAR" | "INGREDIENTS", number> = {
    SIGNATURE: 0,
    SEASONAL: 1,
    REGULAR: 2,
    INGREDIENTS: 3,
  };

  const sortByCategoryThenName = (
    a: (typeof allCocktails)[number],
    b: (typeof allCocktails)[number],
  ) => {
    const categoryDiff = categoryPriority[a.category] - categoryPriority[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name);
  };

  const isIngredientBatchOnly = (cocktail: (typeof allCocktails)[number]) => {
    const premix = premixByCocktailId.get(cocktail.sourceCocktailId);
    const hasBatchRecipe = Boolean(premix && premix.recipeItems.length > 0);
    const hasPremixAmount = Boolean(cocktail.premixNote && cocktail.premixNote.trim().length > 0);
    return cocktail.category === "INGREDIENTS" || (hasBatchRecipe && !hasPremixAmount);
  };

  const mainBatchedRows = allCocktails
    .filter(
      (cocktail) =>
        cocktail.isBatched &&
        !isIngredientBatchOnly(cocktail),
    )
    .sort(sortByCategoryThenName);

  const noPremixCocktailRows = allCocktails
    .filter(
      (cocktail) =>
        !cocktail.isBatched &&
        !isIngredientBatchOnly(cocktail) &&
        cocktail.category !== "INGREDIENTS",
    )
    .sort(sortByCategoryThenName);

  const renderLines = (value?: string | null) => {
    if (!value || value.trim().length === 0) return "-";
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  };

  return (
    <div className="bg-white p-4 text-[11px] text-black">
      <table className="w-full border-collapse border-2 border-black table-fixed">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-normal w-[22%]">Cafe Victor Menu {menuYear}</th>
            <th className="border border-black p-2 text-left font-normal w-[31%]">recipe</th>
            <th className="border border-black p-2 text-left font-normal w-[24%]">method</th>
            <th className="border border-black p-2 text-left font-normal w-[23%]">premix</th>
          </tr>
        </thead>
        <tbody>
          {mainBatchedRows.map((cocktail) => (
            <tr key={cocktail.sourceCocktailId}>
              <td className="border border-black p-2 align-top whitespace-pre-line">
                <div className="font-bold">{cocktail.name}</div>
                <div>Garnish: {cocktail.garnish?.trim() || "-"}</div>
                <div>&nbsp;</div>
                <div>{cocktail.glassware?.trim() || "-"}</div>
              </td>
              <td className="border border-black p-2 align-bottom">
                <div className="min-h-[80px] whitespace-pre-line flex items-end">
                  {cocktail.specs && cocktail.specs.length > 0
                    ? cocktail.specs.map((spec) => `${spec.ml} ml ${spec.ingredient}`).join("\n")
                    : "-"}
                </div>
              </td>
              <td className="border border-black p-2 align-top whitespace-pre-line">
                {[cocktail.technique?.trim(), cocktail.straining?.trim()]
                  .filter((value): value is string => Boolean(value && value.length > 0))
                  .join("\n") || "-"}
              </td>
              <td className="border border-black p-2 align-top whitespace-pre-line">
                {renderLines(cocktail.premixNote)}
              </td>
            </tr>
          ))}

          {noPremixCocktailRows.length > 0 && (
            <tr>
              <td colSpan={4} className="border border-black bg-gray-100 px-2 py-1 text-center">
                
              </td>
            </tr>
          )}

          {noPremixCocktailRows.map((cocktail) => (
            <tr key={cocktail.sourceCocktailId}>
              <td className="border border-black p-2 align-top whitespace-pre-line">
                <div className="font-bold">{cocktail.name}</div>
                <div>Garnish: {cocktail.garnish?.trim() || "-"}</div>
                <div>&nbsp;</div>
                <div>{cocktail.glassware?.trim() || "-"}</div>
              </td>
              <td className="border border-black p-2 align-bottom">
                <div className="min-h-[80px] whitespace-pre-line flex items-end">
                  {cocktail.specs && cocktail.specs.length > 0
                    ? cocktail.specs.map((spec) => `${spec.ml} ml ${spec.ingredient}`).join("\n")
                    : "-"}
                </div>
              </td>
              <td className="border border-black p-2 align-top whitespace-pre-line">
                {[cocktail.technique?.trim(), cocktail.straining?.trim()]
                  .filter((value): value is string => Boolean(value && value.length > 0))
                  .join("\n") || "-"}
              </td>
              <td className="border border-black p-2 align-top">-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrepSpecReport({ data }: { data: DashboardData }) {
  const prepItems = data.prepPlan.filter((p) => p.batchesToMake > 0);
  const now = new Date().toLocaleString();

  return (
    <div className="bg-white p-4 text-[11px] text-black">
      <div className="mb-2 text-[11px]">
        <div>Prep Spec and Batch Plan</div>
        <div>Generated: {now}</div>
        <div>Items to prepare: {prepItems.length}</div>
      </div>

      <table className="mb-4 w-full table-fixed border-collapse border-2 border-black">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-normal">ingredient</th>
            <th className="border border-black p-2 text-right font-normal">total amount</th>
            <th className="border border-black p-2 text-left font-normal">unit</th>
          </tr>
        </thead>
        <tbody>
          {data.ingredientTotals.length === 0 ? (
            <tr>
              <td colSpan={3} className="border border-black p-2 text-center">No ingredient totals available.</td>
            </tr>
          ) : (
            data.ingredientTotals.map((ing, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2">{ing.ingredientName}</td>
                <td className="border border-black p-2 text-right">{ing.totalAmount}</td>
                <td className="border border-black p-2">{ing.unit}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <table className="w-full table-fixed border-collapse border-2 border-black">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-normal">premix</th>
            <th className="border border-black p-2 text-right font-normal">current</th>
            <th className="border border-black p-2 text-right font-normal">weekly use</th>
            <th className="border border-black p-2 text-right font-normal">batches</th>
            <th className="border border-black p-2 text-left font-normal">ingredients</th>
          </tr>
        </thead>
        <tbody>
          {prepItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-black p-2 text-center">No prep needed at this time.</td>
            </tr>
          ) : (
            prepItems.map((prep, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 align-top">{prep.premixName}</td>
                <td className="border border-black p-2 text-right align-top">{prep.currentBottles}</td>
                <td className="border border-black p-2 text-right align-top">{prep.weeklyUseBottles}</td>
                <td className="border border-black p-2 text-right align-top">{prep.batchesToMake}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">
                  {prep.ingredients.map((ing) => `${ing.totalAmount} ${ing.unit} ${ing.ingredientName}`).join("\n")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function InventorySnapshotReport({ data }: { data: DashboardData }) {
  const now = new Date().toLocaleString();

  return (
    <div className="bg-white p-4 text-[11px] text-black">
      <div className="mb-2 text-[11px]">
        <div>Premix Inventory Snapshot</div>
        <div>Generated: {now}</div>
      </div>

      <table className="w-full table-fixed border-collapse border-2 border-black">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left font-normal">premix</th>
            <th className="border border-black p-2 text-right font-normal">current</th>
            <th className="border border-black p-2 text-right font-normal">threshold</th>
            <th className="border border-black p-2 text-right font-normal">target</th>
            <th className="border border-black p-2 text-right font-normal">weekly use</th>
            <th className="border border-black p-2 text-right font-normal">status</th>
          </tr>
        </thead>
        <tbody>
          {data.prepPlan.map((premix, idx) => {
            const status =
              premix.currentBottles < premix.thresholdBottles
                ? "REORDER"
                : premix.currentBottles < premix.thresholdBottles * 1.5
                  ? "LOW"
                  : "OK";

            return (
              <tr key={idx}>
                <td className="border border-black p-2">{premix.premixName}</td>
                <td className="border border-black p-2 text-right">{premix.currentBottles}</td>
                <td className="border border-black p-2 text-right">{premix.thresholdBottles}</td>
                <td className="border border-black p-2 text-right">{premix.targetBottles}</td>
                <td className="border border-black p-2 text-right">{premix.weeklyUseBottles.toFixed(2)}</td>
                <td className="border border-black p-2 text-right">{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
