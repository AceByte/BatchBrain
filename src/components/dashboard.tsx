"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  premixes: Array<{
    id: number;
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
  }>;
  cocktails: Array<{
    id: number;
    name: string;
    category: "REGULAR" | "SEASONAL" | "SIGNATURE";
    glassware: string | null;
    technique: string | null;
    straining: string | null;
    garnish: string | null;
    isBatched: boolean;
    serveExtras: string | null;
    premixItems: Array<{
      premixName: string;
      amountPerDrinkMl: number;
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

function formatCategory(category: DashboardData["cocktails"][number]["category"]) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Draft/edit mode
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  
  // UI state
  const [cocktailSearch, setCocktailSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "REGULAR" | "SEASONAL" | "SIGNATURE">("ALL");
  const [premixSortBy, setPremixSortBy] = useState<"name" | "stock" | "urgency">("urgency");
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    premixes: false,
    cocktails: false,
    prepPlan: false,
  });

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load dashboard data");
      }
      const json = (await response.json()) as DashboardData;
      setData(json);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function adjustStock(premixId: number, deltaBottles: number) {
    // Get current pending value or fall back to original
    const original = data?.premixes.find(p => p.id === premixId)?.currentBottles ?? 0;
    const currentPending = pendingChanges.get(premixId) ?? original;
    const newValue = Math.max(0, currentPending + deltaBottles);
    
    if (newValue === original) {
      // If back to original, remove from pending changes
      const updated = new Map(pendingChanges);
      updated.delete(premixId);
      setPendingChanges(updated);
    } else {
      // Store the new value
      setPendingChanges(prev => new Map(prev).set(premixId, newValue));
    }
  }

  function setStockValue(premixId: number, newValue: number) {
    const original = data?.premixes.find(p => p.id === premixId)?.currentBottles ?? 0;
    const value = Math.max(0, newValue);
    
    if (value === original) {
      // If back to original, remove from pending changes
      const updated = new Map(pendingChanges);
      updated.delete(premixId);
      setPendingChanges(updated);
    } else {
      // Store the new value
      setPendingChanges(prev => new Map(prev).set(premixId, value));
    }
  }

  async function savePendingChanges() {
    if (pendingChanges.size === 0) return;
    
    setIsSaving(true);
    try {
      const changes = Array.from(pendingChanges.entries()).map(([id, newValue]) => {
        const original = data?.premixes.find(p => p.id === id);
        return {
          id,
          newValue,
          deltaBottles: newValue - (original?.currentBottles ?? 0),
        };
      });

      const response = await fetch("/api/premix/batch-adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to save changes");
      }

      setPendingChanges(new Map());
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function discardPendingChanges() {
    setPendingChanges(new Map());
  }

  const lowPremixCount = useMemo(
    () =>
      data?.prepPlan.filter((item) => item.projectedEndBottles < item.thresholdBottles)
        .length ?? 0,
    [data],
  );
  
  // Filtered and sorted data
  const filteredCocktails = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.cocktails;
    
    // Apply category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    
    // Apply search
    if (cocktailSearch) {
      const search = cocktailSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.premixItems.some(p => p.premixName.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  }, [data, categoryFilter, cocktailSearch]);
  
  const sortedPremixes = useMemo(() => {
    if (!data) return [];
    
    const premixes = data.premixes.map(p => ({
      ...p,
      currentBottles: pendingChanges.has(p.id) ? pendingChanges.get(p.id)! : p.currentBottles,
    }));
    
    switch (premixSortBy) {
      case "name":
        return premixes.sort((a, b) => a.name.localeCompare(b.name));
      case "stock":
        return premixes.sort((a, b) => a.currentBottles - b.currentBottles);
      case "urgency":
        return premixes.sort((a, b) => {
          const aUrgent = a.currentBottles < a.thresholdBottles;
          const bUrgent = b.currentBottles < b.thresholdBottles;
          if (aUrgent && !bUrgent) return -1;
          if (!aUrgent && bUrgent) return 1;
          return (a.currentBottles / a.thresholdBottles) - (b.currentBottles / b.thresholdBottles);
        });
      default:
        return premixes;
    }
  }, [data, premixSortBy, pendingChanges]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-lg font-semibold text-slate-600">Loading BatchBrain data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-md rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">❌</span>
            <p className="text-xl font-bold text-red-800">Unable to load dashboard</p>
          </div>
          <p className="mt-3 text-sm text-red-700">{error ?? "Unknown error"}</p>
          <button
            onClick={loadData}
            className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-all hover:bg-red-700 hover:shadow-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 p-6 shadow-lg print:border-slate-300 print:bg-white print:text-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white print:text-slate-900">BatchBrain</h1>
              <p className="mt-2 text-blue-50 print:text-slate-600">
                Weekly prep control for premix stock, cocktail specs, and batching needs.
              </p>
              {lowPremixCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-md">
                  <span className="text-lg">⚠️</span>
                  <span>{lowPremixCount} premix item{lowPremixCount !== 1 ? 's' : ''} below threshold this week</span>
                </div>
              )}
              {pendingChanges.size > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-yellow-900 shadow-md">
                  <span>✏️</span>
                  <span>{pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {pendingChanges.size > 0 && (
                <>
                  <button
                    onClick={savePendingChanges}
                    disabled={isSaving}
                    className="rounded-lg border-2 border-white bg-green-500 px-4 py-2 font-semibold text-white transition-all hover:border-green-300 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                  >
                    {isSaving ? "Saving..." : "💾 Save"}
                  </button>
                  <button
                    onClick={discardPendingChanges}
                    disabled={isSaving}
                    className="rounded-lg border-2 border-white bg-red-500 px-4 py-2 font-semibold text-white transition-all hover:border-red-300 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                  >
                    ✕ Discard
                  </button>
                </>
              )}
              <button
                onClick={() => window.print()}
                className="rounded-lg border-2 border-white bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20 print:hidden"
              >
                🖨️ Print Prep List
              </button>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Total Premixes</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{data?.premixes.length ?? 0}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Total Cocktails</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">{data?.cocktails.length ?? 0}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Batches Needed</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {data?.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0) ?? 0}
            </p>
          </div>
          <div className={`rounded-xl border-2 p-4 shadow-sm ${
            lowPremixCount > 0 
              ? 'border-red-300 bg-red-50' 
              : 'border-green-300 bg-green-50'
          }`}>
            <p className="text-sm font-semibold text-slate-600">Low Stock Items</p>
            <p className={`mt-1 text-3xl font-bold ${
              lowPremixCount > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {lowPremixCount}
            </p>
          </div>
        </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">💧 Premix Inventory</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Sort by:</label>
            <select 
              value={premixSortBy}
              onChange={(e) => setPremixSortBy(e.target.value as any)}
              className="rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="urgency">Urgency</option>
              <option value="name">Name</option>
              <option value="stock">Stock Level</option>
            </select>
            <button
              onClick={() => setSectionsCollapsed(prev => ({ ...prev, premixes: !prev.premixes }))}
              className="ml-2 rounded-lg border-2 border-slate-200 bg-white p-2 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              {sectionsCollapsed.premixes ? '▼' : '▲'}
            </button>
          </div>
        </div>
        {!sectionsCollapsed.premixes && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="pb-3 pr-4">Premix</th>
                <th className="pb-3 pr-4">Current (bottles)</th>
                <th className="pb-3 pr-4">Threshold (bottles)</th>
                <th className="pb-3 pr-4">Target (bottles)</th>
                <th className="pb-3 pr-4">Batch Yield (bottles)</th>
                <th className="pb-3">Quick Adjust</th>
              </tr>
            </thead>
            <tbody>
              {sortedPremixes.map((premix) => {
                const isLow = premix.currentBottles < premix.thresholdBottles;
                const isCritical = premix.currentBottles < premix.thresholdBottles * 0.5;
                const hasChange = pendingChanges.has(premix.id);
                const originalValue = data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0;
                const stockClass = isCritical 
                  ? 'bg-red-50 border-l-4 border-red-500' 
                  : isLow 
                  ? 'bg-amber-50 border-l-4 border-amber-500' 
                  : 'border-l-4 border-transparent';
                
                return (
                  <tr key={premix.id} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${stockClass} ${hasChange ? 'bg-blue-50' : ''}`}>
                    <td className="py-4 pr-4">
                      <div className="flex items-start gap-2">
                        {isCritical && <span className="text-lg">🔴</span>}
                        {isLow && !isCritical && <span className="text-lg">🟡</span>}
                        {hasChange && <span className="text-lg">✏️</span>}
                        <div>
                          <p className="font-semibold text-slate-800">{premix.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {premix.recipeItems
                              .map(
                                (item) =>
                                  `${item.ingredientName} ${item.amountPerBatch}${item.unit}`,
                              )
                              .join(" • ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-4 pr-4 font-semibold ${isCritical ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-slate-700'}`}>
                      <div className="flex items-center gap-1">
                        {premix.currentBottles.toFixed(2)}
                        {hasChange && (
                          <span className="text-xs text-slate-500">({originalValue.toFixed(2)})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{premix.thresholdBottles.toFixed(2)}</td>
                    <td className="py-4 pr-4 text-slate-600">{premix.targetBottles.toFixed(2)}</td>
                    <td className="py-4 pr-4 text-slate-600">{premix.batchYieldBottles.toFixed(2)}</td>
                    <td className="py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded-lg border-2 border-red-200 bg-white px-2 py-1 text-sm font-bold text-red-700 transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => adjustStock(premix.id, -5)}
                          >
                            -5
                          </button>
                          <button
                            className="rounded-lg border-2 border-red-200 bg-white px-2 py-1 text-sm font-bold text-red-700 transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => adjustStock(premix.id, -1)}
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={pendingChanges.get(premix.id) ?? (data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0)}
                            onChange={(e) => setStockValue(premix.id, Number(e.target.value))}
                            className="w-16 rounded-lg border-2 border-slate-300 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800 transition-all focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            className="rounded-lg border-2 border-green-200 bg-white px-2 py-1 text-sm font-bold text-green-700 transition-all hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
                            onClick={() => adjustStock(premix.id, 1)}
                          >
                            +1
                          </button>
                          <button
                            className="rounded-lg border-2 border-green-200 bg-white px-2 py-1 text-sm font-bold text-green-700 transition-all hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
                            onClick={() => adjustStock(premix.id, 5)}
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">🍸 Cocktail Specsheet</h2>
          <button
            onClick={() => setSectionsCollapsed(prev => ({ ...prev, cocktails: !prev.cocktails }))}
            className="rounded-lg border-2 border-slate-200 bg-white p-2 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            {sectionsCollapsed.cocktails ? '▼' : '▲'}
          </button>
        </div>
        {!sectionsCollapsed.cocktails && (
        <>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search cocktails..."
            value={cocktailSearch}
            onChange={(e) => setCocktailSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            {["ALL", "REGULAR", "SEASONAL", "SIGNATURE"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat as any)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Showing {filteredCocktails.length} of {data?.cocktails.length ?? 0} cocktails
        </div>
        {filteredCocktails.length === 0 ? (
          <div className="mt-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-600">No cocktails found</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCocktails.map((cocktail) => {
            const categoryColors = {
              REGULAR: 'bg-blue-100 text-blue-800 border-blue-200',
              SEASONAL: 'bg-purple-100 text-purple-800 border-purple-200',
              SIGNATURE: 'bg-amber-100 text-amber-800 border-amber-200',
            };
            const categoryEmoji = {
              REGULAR: '🥃',
              SEASONAL: '🌸',
              SIGNATURE: '⭐',
            };
            
            return (
              <article 
                key={cocktail.id} 
                className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{cocktail.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryColors[cocktail.category]}`}>
                    <span>{categoryEmoji[cocktail.category]}</span>
                    {formatCategory(cocktail.category)}
                  </span>
                </div>
                
                {/* Spec details */}
                <div className="mt-3 space-y-2 text-sm">
                  {cocktail.glassware && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600">🍷 Glass:</span>
                      <span className="text-slate-700">{cocktail.glassware}</span>
                    </div>
                  )}
                  {cocktail.technique && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600">🔧 Technique:</span>
                      <span className="text-slate-700">{cocktail.technique}</span>
                    </div>
                  )}
                  {cocktail.straining && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600">⚗️ Straining:</span>
                      <span className="text-slate-700">{cocktail.straining}</span>
                    </div>
                  )}
                  {cocktail.garnish && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600">🌿 Garnish:</span>
                      <span className="text-slate-700">{cocktail.garnish}</span>
                    </div>
                  )}
                  {cocktail.serveExtras && (
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600">✨ Serve Extras:</span>
                      <span className="text-slate-700">{cocktail.serveExtras}</span>
                    </div>
                  )}
                  {cocktail.isBatched && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      <span>📦</span>
                      Batched
                    </div>
                  )}
                </div>
                
                {/* Ingredients */}
                {cocktail.premixItems.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Ingredients:</p>
                    <ul className="space-y-1.5 text-sm">
                      {cocktail.premixItems.map((premixItem, idx) => (
                        <li key={`${cocktail.id}-${premixItem.premixName}-${idx}`} className="flex items-center gap-2 text-slate-700">
                          <span className="text-blue-500">▸</span>
                          <span className="font-medium">{premixItem.premixName}:</span>
                          <span className="text-slate-600">{premixItem.amountPerDrinkMl}ml</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        )}
        </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">📋 Prep List (This Week)</h2>
          <button
            onClick={() => setSectionsCollapsed(prev => ({ ...prev, prepPlan: !prev.prepPlan }))}
            className="rounded-lg border-2 border-slate-200 bg-white p-2 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            {sectionsCollapsed.prepPlan ? '▼' : '▲'}
          </button>
        </div>
        {!sectionsCollapsed.prepPlan && (
        <>
        <div className="mt-4 space-y-4">
          {data.prepPlan.map((item) => {
            const needsPrep = item.batchesToMake > 0;
            const isUrgent = item.projectedEndBottles < item.thresholdBottles;
            const isCritical = item.projectedEndBottles < item.thresholdBottles * 0.5;
            
            const cardClass = isCritical
              ? 'border-2 border-red-400 bg-gradient-to-r from-red-50 to-red-100 shadow-md'
              : isUrgent
              ? 'border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100 shadow-md'
              : needsPrep
              ? 'border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'
              : 'border-2 border-slate-200 bg-white';
            
            return (
              <article key={item.premixId} className={`rounded-xl p-5 transition-all ${cardClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isCritical && <span className="text-2xl">🔴</span>}
                    {isUrgent && !isCritical && <span className="text-2xl">⚠️</span>}
                    {needsPrep && !isUrgent && <span className="text-2xl">📦</span>}
                    <h3 className="text-lg font-bold text-slate-800">{item.premixName}</h3>
                  </div>
                  {needsPrep ? (
                    <div className={`rounded-lg px-4 py-2 text-center ${isCritical ? 'bg-red-600 text-white' : isUrgent ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide">Make</p>
                      <p className="text-2xl font-bold">{item.batchesToMake}</p>
                      <p className="text-xs">batch{item.batchesToMake !== 1 ? 'es' : ''} ({item.bottlesToProduce.toFixed(2)} bottles)</p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-green-100 px-4 py-2 text-center">
                      <p className="text-sm font-semibold text-green-800">✓ Stock OK</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-white/50 p-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="font-semibold text-slate-600">Current</p>
                    <p className="text-lg font-bold text-slate-800">{item.currentBottles.toFixed(2)} bottles</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">Weekly Use</p>
                    <p className="text-lg font-bold text-slate-800">{item.weeklyUseBottles.toFixed(2)} bottles</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">Projected End</p>
                    <p className={`text-lg font-bold ${isCritical ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-slate-800'}`}>
                      {item.projectedEndBottles.toFixed(2)} bottles
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600">Threshold</p>
                    <p className="text-lg font-bold text-slate-800">{item.thresholdBottles.toFixed(2)} bottles</p>
                  </div>
                </div>
                {item.ingredients.length > 0 && needsPrep && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Ingredients Needed:</p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {item.ingredients.map((ingredient, idx) => (
                        <li 
                          key={`${item.premixId}-${ingredient.ingredientName}-${idx}`}
                          className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm shadow-sm"
                        >
                          <span className="text-blue-500">●</span>
                          <span className="font-semibold text-slate-800">{ingredient.ingredientName}:</span>
                          <span className="text-slate-600">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border-2 border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800">🛒 Total Ingredients Shopping List</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.ingredientTotals.map((ingredient, idx) => (
              <li 
                key={`${ingredient.ingredientName}-${ingredient.unit}-${idx}`}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-xl">📦</span>
                <span className="font-bold text-slate-800">{ingredient.ingredientName}:</span>
                <span className="font-semibold text-blue-600">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
              </li>
            ))}
          </ul>
        </div>
        </>
        )}
      </section>
      </div>
    </div>
  );
}
