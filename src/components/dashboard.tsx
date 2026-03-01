"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductionForm } from "./production-form";

type DashboardData = {
  premixes: Array<{
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
  }>;
  cocktails: Array<{
    id: number;
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  
  // Draft/edit mode
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("Manual adjustment");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [selectedPremixes, setSelectedPremixes] = useState<Set<number>>(new Set());
  
  // UI state
  const [cocktailSearch, setCocktailSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS">("ALL");
  const [premixSortBy, setPremixSortBy] = useState<"name" | "stock" | "urgency">("urgency");
  const [currentView, setCurrentView] = useState<"cocktails" | "inventory" | "prep">("inventory");

  const viewOrder: Array<"cocktails" | "inventory" | "prep"> = ["cocktails", "inventory", "prep"];
  const currentViewIndex = viewOrder.indexOf(currentView);

  const viewTitles: Record<"cocktails" | "inventory" | "prep", string> = {
    cocktails: "🍸 Spec Sheet",
    inventory: "💧 Inventory",
    prep: "📋 Prep List",
  };

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
      setLastUpdated(new Date());
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (pendingChanges.size > 0 && !isSaving) {
          savePendingChanges();
        }
      }
      // Escape to discard with confirmation
      if (e.key === 'Escape' && pendingChanges.size > 0) {
        if (confirm(`Discard ${pendingChanges.size} pending change(s)?`)) {
          discardPendingChanges();
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [pendingChanges, isSaving]);


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
        body: JSON.stringify({ 
          changes,
          reason: adjustmentReason,
          notes: adjustmentNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to save changes");
      }

      setPendingChanges(new Map());
      setAdjustmentReason("Manual adjustment");
      setAdjustmentNotes("");
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

  function togglePremixSelection(id: number) {
    const newSelection = new Set(selectedPremixes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPremixes(newSelection);
  }

  function selectAllPremixes() {
    setSelectedPremixes(new Set(data?.premixes.map(p => p.id) ?? []));
  }

  function clearSelection() {
    setSelectedPremixes(new Set());
  }

  function applyBulkAdjustment(delta: number) {
    if (selectedPremixes.size === 0) return;
    
    // Apply batch-sized adjustments
    selectedPremixes.forEach(id => {
      const premix = data?.premixes.find(p => p.id === id);
      if (premix) {
        // Calculate delta in batches, not individual bottles
        const batchAdjustment = delta * premix.batchYieldBottles;
        adjustStock(id, batchAdjustment);
      }
    });
    
    clearSelection();
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
        c.specs.some(s => s.ingredient.toLowerCase().includes(search))
      );
    }
    
    // Estimate card height and sort for balanced columns
    return filtered.sort((a, b) => {
      const estimateHeight = (cocktail: typeof data.cocktails[0]) => {
        let height = 60; // Base height for name/category
        
        // Details section height
        const detailsCount = (cocktail.glassware ? 1 : 0) + (cocktail.technique ? 1 : 0) + (cocktail.garnish ? 1 : 0);
        if (detailsCount > 0) {
          height += 20 + (detailsCount * 24) + 16; // header + items + padding
        }
        
        // Ingredients section height
        const ingredientCount = cocktail.specs.length + (cocktail.serveExtras ? 1 : 0);
        if (ingredientCount > 0) {
          height += 20 + (ingredientCount * 24) + 16; // header + items + padding
        }
        
        return height;
      };
      
      return estimateHeight(b) - estimateHeight(a); // Descending (tallest first)
    });
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

  const premixSpecsByName = useMemo(() => {
    const premixMap = new Map<string, DashboardData["premixes"][number]>();
    if (!data) {
      return premixMap;
    }

    for (const premix of data.premixes) {
      premixMap.set(premix.name.toLowerCase().trim(), premix);
    }

    return premixMap;
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg"></div>
          <p className="mt-6 text-sm font-bold text-slate-700">Loading BatchBrain data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4">
        <div className="max-w-md rounded-3xl bg-gradient-to-br from-red-50 to-rose-50 p-8 shadow-2xl ring-2 ring-red-300">
          <div className="flex items-center gap-4">
            <span className="text-4xl">❌</span>
            <p className="text-2xl font-extrabold text-red-800">Unable to load dashboard</p>
          </div>
          <p className="mt-4 text-sm font-medium text-red-700">{error ?? "Unknown error"}</p>
          <button
            onClick={loadData}
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-red-600 to-rose-700 px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:from-red-700 hover:to-rose-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className={`mx-auto flex w-full flex-col gap-4 ${isMobile ? "p-2 pb-20 md:p-6 lg:p-8" : "p-4 md:p-6 lg:p-8"}`}>
        {/* Top Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 print:hidden ${isMobile ? "gap-2" : "gap-4"}`}>
          <div className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}>
            <button
              onClick={loadData}
              disabled={loading}
              className={`rounded-xl bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl disabled:opacity-50 ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"} font-semibold`}
              title="Refresh data (F5)"
            >
              🔄 {isMobile ? "Refresh" : "Refresh"}
            </button>
            {lastUpdated && (
              <span className={`font-medium text-slate-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                {isMobile ? "Updated" : "Last updated"}: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <a
            href="/analytics"
            className={`rounded-xl bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
          >
            📊 {isMobile ? "Analytics" : "Analytics"}
          </a>
        </div>

        <header className={`relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 shadow-lg print:border-slate-300 print:bg-white print:text-slate-900 ${isMobile ? "p-2" : "p-3"}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`font-extrabold tracking-tight text-white print:text-slate-900 ${isMobile ? "text-xl" : "text-2xl"}`}>BatchBrain</h1>
              {lowPremixCount > 0 && (
                <div className="mt-1 inline-flex items-center gap-0.5 rounded px-2 py-0.5 bg-red-500 text-[12px] font-semibold text-white">
                  <span>⚠️</span>
                  <span>{lowPremixCount} item{lowPremixCount !== 1 ? 's' : ''} low</span>
                </div>
              )}
              {pendingChanges.size > 0 && (
                <div className="mt-0.5 inline-flex items-center gap-0.5 rounded px-2 py-0.5 bg-yellow-400 text-xs font-semibold text-yellow-900">
                  <span>✏️</span>
                  <span>{pendingChanges.size} pending</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 sm:flex-row">
              {pendingChanges.size > 0 && (
                <>
                  <button
                    onClick={savePendingChanges}
                    disabled={isSaving}
                    className="rounded-lg border-2 border-white bg-green-500 px-4 py-2 font-semibold text-white transition-all hover:border-green-300 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                    title="Save changes (Ctrl+S)"
                  >
                    {isSaving ? "Saving..." : "💾 Save"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Discard ${pendingChanges.size} pending change(s)?`)) {
                        discardPendingChanges();
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-lg border-2 border-white bg-red-500 px-4 py-2 font-semibold text-white transition-all hover:border-red-300 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                    title="Discard changes (Esc)"
                  >
                    ✕ Discard
                  </button>
                </>
              )}
            </div>
          </div>

          {pendingChanges.size > 0 && (
            <div className="mt-6 grid gap-4 rounded-2xl bg-white/20 p-5 backdrop-blur-md sm:grid-cols-2 print:hidden">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Reason for adjustment:
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="Manual adjustment">Manual adjustment</option>
                  <option value="Stock recount">Stock recount</option>
                  <option value="Spillage">Spillage</option>
                  <option value="Product damage">Product damage</option>
                  <option value="Inventory correction">Inventory correction</option>
                  <option value="Production batch completed">Production batch completed</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Notes (optional):
                </label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          )}
        </header>

        {/* Quick Stats */}
        <div className={`grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`}>
          <div className={`group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-slate-400 text-xs`}>Total Premixes</p>
            <p className={`mt-0.5 font-extrabold text-white ${isMobile ? "text-lg" : "text-xl"}`}>{data?.premixes.length ?? 0}</p>
          </div>
          <div className={`group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-slate-400 text-xs`}>Total Cocktails</p>
            <p className={`mt-0.5 font-extrabold text-white ${isMobile ? "text-lg" : "text-xl"}`}>{data?.cocktails.length ?? 0}</p>
          </div>
          <div className={`group rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 shadow-md ring-1 ring-blue-700 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-blue-300 text-xs`}>Batches Needed</p>
            <p className={`mt-0.5 font-extrabold text-blue-100 ${isMobile ? "text-lg" : "text-xl"}`}>
              {data?.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0) ?? 0}
            </p>
          </div>
          <div className={`group rounded-lg shadow-md ring-1 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"} ${
            lowPremixCount > 0 
              ? 'bg-gradient-to-br from-red-900 to-rose-900 ring-red-700' 
              : 'bg-gradient-to-br from-green-900 to-emerald-900 ring-green-700'
          }`}>
            <p className={`font-semibold uppercase tracking-wider text-xs ${
              lowPremixCount > 0 ? 'text-red-300' : 'text-green-300'
            }`}>Low Stock Items</p>
            <p className={`mt-0.5 font-extrabold ${isMobile ? "text-lg" : "text-xl"} ${
              lowPremixCount > 0 ? 'text-red-100' : 'text-green-100'
            }`}>
              {lowPremixCount}
            </p>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-lg bg-slate-800/80 shadow-md ring-1 ring-slate-700 print:hidden ${isMobile ? "fixed bottom-2 left-2 right-2 z-50 p-2 backdrop-blur-lg bg-slate-800/95" : "p-1.5"}`}>
          <button
            onClick={() => setCurrentView(viewOrder[(currentViewIndex - 1 + viewOrder.length) % viewOrder.length])}
            className={`rounded-lg bg-slate-700 text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600 font-semibold ${isMobile ? "px-3 py-2 text-sm" : "px-2 py-1 text-sm"}`}
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold uppercase tracking-wider text-slate-400 text-xs">View</p>
            <p className={`font-extrabold text-white ${isMobile ? "text-sm" : "text-sm"}`}>{viewTitles[currentView]}</p>
          </div>
          <button
            onClick={() => setCurrentView(viewOrder[(currentViewIndex + 1) % viewOrder.length])}
            className={`rounded-lg bg-slate-700 text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600 font-semibold ${isMobile ? "px-3 py-2 text-sm" : "px-2 py-1 text-sm"}`}
          >
            →
          </button>
        </div>

      {currentView === "inventory" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className={`flex flex-wrap items-center justify-between gap-2 ${isMobile ? "gap-2" : "gap-4"}`}>
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>💧 Premix Inventory</h2>
          <div className={`flex items-center gap-2 ${isMobile ? "w-full flex-wrap" : "gap-3"}`}>
            <button
              onClick={() => setShowProductionForm(true)}
              className={`rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md transition-all hover:shadow-lg print:hidden font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
            >
              📦 Log Production
            </button>
            <label className={`font-semibold text-slate-300 ${isMobile ? "text-xs" : "text-sm"}`}>Sort by:</label>
            <select 
              value={premixSortBy}
              onChange={(e) => setPremixSortBy(e.target.value as any)}
              className={`rounded-xl bg-slate-700 text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${isMobile ? "px-2 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
            >
              <option value="urgency">Urgency</option>
              <option value="name">Name</option>
              <option value="stock">Stock Level</option>
            </select>
          </div>
        </div>

        {/* Bulk operations toolbar */}
        {selectedPremixes.size > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 p-5 shadow-inner ring-1 ring-blue-700 print:hidden">
            <span className="text-lg font-bold text-blue-100">
              {selectedPremixes.size} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => applyBulkAdjustment(-1)}
                className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                -1 Batch
              </button>
              <button
                onClick={() => applyBulkAdjustment(1)}
                className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                +1 Batch
              </button>
              <button
                onClick={() => applyBulkAdjustment(2)}
                className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                +2 Batches
              </button>
            </div>
            <div className="ml-auto flex gap-3">
              <button
                onClick={selectAllPremixes}
                className="text-sm font-semibold text-blue-200 transition-colors hover:text-blue-100"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm font-semibold text-blue-200 transition-colors hover:text-blue-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {sortedPremixes.map((premix) => {
                const isLow = premix.currentBottles < premix.thresholdBottles;
                const isCritical = premix.currentBottles < premix.thresholdBottles * 0.5;
                const hasChange = pendingChanges.has(premix.id);
                const originalValue = data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0;
                const cardClass = isCritical 
                  ? 'bg-red-900/30 border-l-4 border-red-500' 
                  : isLow 
                  ? 'bg-amber-900/30 border-l-4 border-amber-500' 
                  : hasChange
                  ? 'bg-blue-900/30 border-l-4 border-blue-500'
                  : 'bg-slate-900/50 border-l-4 border-transparent';
                
                return (
                  <div key={premix.id} className={`rounded-lg p-3 ring-1 ring-slate-700 transition-all hover:bg-slate-700/50 ${cardClass}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedPremixes.has(premix.id)}
                          onChange={() => togglePremixSelection(premix.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-600 print:hidden"
                        />
                        <div className="flex items-start gap-2 flex-1">
                          {isCritical && <span className="text-lg">🔴</span>}
                          {isLow && !isCritical && <span className="text-lg">🟡</span>}
                          {hasChange && <span className="text-lg">✏️</span>}
                          <div className="flex-1">
                            <p className="font-semibold text-white text-sm">{premix.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2 md:items-start">
                      {premix.recipeItems.length > 0 && (
                        <div className="rounded bg-slate-900/70 p-1.5 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-300">Ingredients:</p>
                          <ul className="space-y-0.5">
                            {premix.recipeItems.map((item, itemIndex) => (
                              <li
                                key={`${premix.id}-${item.ingredientName}-${itemIndex}`}
                                className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5"
                              >
                                <span className="font-semibold text-slate-100">{item.ingredientName}</span>
                                <span className="font-extrabold text-blue-300">{item.amountPerBatch}{item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className={`grid grid-cols-2 gap-2 text-sm ${premix.recipeItems.length === 0 ? 'md:col-span-2' : ''}`}>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-sm font-bold text-slate-400">Current</p>
                          <p className={`text-sm font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-200'}`}>
                            {premix.currentBottles.toFixed(2)}
                            {hasChange && (
                              <span className="text-sm text-slate-500 ml-1">({originalValue.toFixed(2)})</span>
                            )}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-sm font-bold text-slate-400">Threshold</p>
                          <p className="text-sm font-bold text-slate-300">{premix.thresholdBottles.toFixed(2)}</p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-sm font-bold text-slate-400">Target</p>
                          <p className="text-sm font-bold text-slate-300">{premix.targetBottles.toFixed(2)}</p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-sm font-bold text-slate-400">Batch Yield</p>
                          <p className="text-sm font-bold text-slate-300">{premix.batchYieldBottles.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`mt-2 flex items-stretch print:hidden ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, -5)}
                      >
                        -5
                      </button>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-red-400 to-red-500 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, -1)}
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={pendingChanges.get(premix.id) ?? (data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0)}
                        onChange={(e) => setStockValue(premix.id, Number(e.target.value))}
                        className={`rounded-lg bg-slate-700 text-center font-bold text-white shadow-sm ring-1 ring-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'w-16 px-2 py-1.5 text-sm' : 'w-24 px-3 py-2.5 text-base'}`}
                      />
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, 5)}
                      >
                        +5
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
      </section>
      )}

      {currentView === "cocktails" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>🍸 Cocktail Specsheet</h2>
        </div>
        <div className={`flex flex-wrap gap-2 ${isMobile ? "gap-2 mt-4" : "mt-6 gap-3"}`}>
          <input
            type="text"
            placeholder="Search cocktails..."
            value={cocktailSearch}
            onChange={(e) => setCocktailSearch(e.target.value)}
            className={`flex-1 rounded-xl bg-slate-700 text-white ring-1 ring-slate-600 transition-all placeholder:text-slate-400 focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? "min-w-[150px] px-3 py-2 text-xs" : "min-w-[200px] px-5 py-3 text-sm"}`}
          />
          <div className="flex flex-wrap gap-2">
            {["ALL", "REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat as any)}
                className={`rounded-xl font-semibold transition-all ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"} ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-700 text-slate-200 ring-1 ring-slate-600 hover:bg-slate-600 hover:shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className={`font-medium text-slate-400 ${isMobile ? "text-xs mt-2" : "text-sm mt-2"}`}>
          Showing {filteredCocktails.length} of {data?.cocktails.length ?? 0} cocktails
        </div>
        {filteredCocktails.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-10 text-center ring-1 ring-slate-600">
            <p className="text-base font-bold text-slate-300">No cocktails found</p>
            <p className="mt-2 text-xs font-medium text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
        <div className={`grid gap-3 mt-4 ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
          {filteredCocktails
            .sort((a, b) => {
              // Calculate content length for sorting
              const getContentLength = (cocktail: typeof filteredCocktails[0]) => {
                let length = 0;
                // Count details
                if (cocktail.glassware) length++;
                if (cocktail.technique) length++;
                if (cocktail.garnish) length++;
                // Count premix lines
                if (cocktail.isBatched && cocktail.premixNote) {
                  length += cocktail.premixNote.split('\n').length;
                }
                // Count ingredients
                length += cocktail.specs.length;
                // Count serve extras
                if (cocktail.serveExtras) length++;
                return length;
              };
              return getContentLength(b) - getContentLength(a); // Descending (most content first)
            })
            .map((cocktail) => {
            const categoryColors = {
              REGULAR: 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 ring-blue-700/50',
              SEASONAL: 'bg-gradient-to-r from-purple-900/40 to-purple-800/20 ring-purple-700/50',
              SIGNATURE: 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 ring-amber-700/50',
              INGREDIENTS: 'bg-gradient-to-r from-emerald-900/40 to-teal-800/20 ring-emerald-700/50',
            };
            const categoryBadgeColors = {
              REGULAR: 'bg-gradient-to-br from-blue-900 to-blue-800 text-blue-200 ring-1 ring-blue-700',
              SEASONAL: 'bg-gradient-to-br from-purple-900 to-purple-800 text-purple-200 ring-1 ring-purple-700',
              SIGNATURE: 'bg-gradient-to-br from-amber-900 to-amber-800 text-amber-200 ring-1 ring-amber-700',
              INGREDIENTS: 'bg-gradient-to-br from-emerald-900 to-teal-800 text-emerald-200 ring-1 ring-emerald-700',
            };
            const categoryEmoji = {
              REGULAR: '🥃',
              SEASONAL: '🌸',
              SIGNATURE: '⭐',
              INGREDIENTS: '🧂',
            };
            const specRows = cocktail.specs.map((spec, idx) => ({
              spec,
              idx,
            }));
            
            return (
              <article 
                key={cocktail.id} 
                className={`group rounded-lg ${categoryColors[cocktail.category]} p-2.5 shadow-md ring-1 transition-all hover:shadow-lg`}
              >
                <div className="grid gap-2 grid-cols-1">
                  {/* Left column: Name and category */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-white">{cocktail.name}</h3>
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${categoryBadgeColors[cocktail.category]}`}>
                        <span>{categoryEmoji[cocktail.category]}</span>
                        {formatCategory(cocktail.category)}
                      </span>
                      {cocktail.isBatched && (
                        <div className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-br from-green-900 to-emerald-900 px-1.5 py-0.5 text-xs font-bold text-green-200 ring-1 ring-green-700">
                          <span>📦</span>
                          Batched
                        </div>
                      )}
                    </div>
                    
                    {/* Cocktail Details (Glass, Technique, Garnish) */}
                    {(cocktail.glassware || cocktail.technique || cocktail.garnish) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Details</p>
                        <ul className="space-y-1">
                          {cocktail.glassware && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Glass</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.glassware}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.technique && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Technique</span>
                                <span className="ml-5 font-extrabold text-blue-300">{cocktail.technique}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.garnish && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Garnish</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.garnish}</span>
                              </div>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Premix - Only for batched cocktails with premixNote */}
                    {cocktail.isBatched && cocktail.premixNote && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Premix</p>
                        <ul className="space-y-1">
                          {cocktail.premixNote.split('\n').map((line, idx) => {
                            // Parse "amount ingredient" format (e.g., "7cl Premix" → amount: "7cl", ingredient: "Premix")
                            const match = line.match(/^([0-9.]+\s*[a-zA-Z]+)\s+(.+)$/);
                            const amount = match ? match[1].trim() : '';
                            const ingredient = match ? match[2].trim() : line;
                            
                            return (
                              <li
                                key={`${cocktail.id}-premix-line-${idx}`}
                                className="rounded-md bg-slate-800/70 px-2 py-1"
                              >
                                <div className="flex items-center justify-between text-xs leading-5">
                                  <span className="font-semibold text-slate-100">{ingredient}</span>
                                  {amount && <span className="font-extrabold text-blue-300">{amount}</span>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Ingredients */}
                    {(specRows.length > 0 || cocktail.serveExtras) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Ingredients</p>
                        <ul className="space-y-1">
                          {specRows.map(({ spec, idx }) => (
                            <li
                              key={`${cocktail.id}-${spec.ingredient}-${idx}`}
                              className="rounded-md bg-slate-800/70 px-2 py-1"
                            >
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">{spec.ingredient}</span>
                                <span className="font-extrabold text-blue-300">{spec.ml}ml</span>
                              </div>
                            </li>
                          ))}
                          {cocktail.serveExtras && (
                            cocktail.serveExtras.split(/[,\n]/).map((line, idx) => {
                              const trimmedLine = line.trim();
                              if (!trimmedLine) return null; // Skip empty lines
                              
                              return (
                                <li
                                  key={`${cocktail.id}-serve-extra-${idx}`}
                                  className="rounded-md bg-slate-800/70 px-2 py-1"
                                >
                                  <div className="flex items-center justify-between text-xs leading-5">
                                    <span className="font-semibold text-slate-100"></span>
                                    <span className="ml-2 font-extrabold text-blue-300">{trimmedLine}</span>
                                  </div>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}
      </section>
      )}

      {currentView === "prep" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>📋 Prep List (This Week)</h2>
        </div>

        {(() => {
          const bottlesNeeded = data.prepPlan.reduce((total, item) => {
            const bottlesForThisItem = item.ingredients.reduce((sum, ing) => {
              const ingNameLower = ing.ingredientName.toLowerCase();
              const emptyBottleIngredients = ['juice', 'honey syrup', 'espresso martini', 'spice mix', 'passionfruit puree'];
              const waterSugarIngredients = ['water', 'sugar'];
              
              if (emptyBottleIngredients.some(name => ingNameLower.includes(name.toLowerCase()))) {
                return sum + ing.totalAmount;
              }
              
              // For water and sugar, check they don't contain syrup or "still water"
              if (waterSugarIngredients.some(name => ingNameLower.includes(name.toLowerCase()))) {
                if (!ingNameLower.includes('syrup') && !ingNameLower.includes('still water')) {
                  return sum + ing.totalAmount;
                }
              }
              
              return sum;
            }, 0);
            return total + bottlesForThisItem;
          }, 0);

          return bottlesNeeded > 0 && (
            <div className="mt-4 rounded-lg bg-blue-900/40 ring-1 ring-blue-700 p-3">
              <p className="text-sm font-semibold text-blue-200">
                🍾 Empty Bottles Needed: <span className="text-lg font-bold text-blue-100">{Math.ceil(bottlesNeeded)}</span>
              </p>
            </div>
          );
        })()}

        {data.prepPlan.filter(item => item.batchesToMake > 0).length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-green-900 to-emerald-900 p-8 text-center ring-1 ring-green-700">
            <p className="text-base font-bold text-green-200">✓ All stock levels are good!</p>
            <p className="mt-2 text-sm font-medium text-green-300">No prep needed this week.</p>
          </div>
        ) : (
        <div className="mt-6 space-y-4">
          {(() => {
            const prepItems = data.prepPlan.filter(item => item.batchesToMake > 0);
            const criticalItems = prepItems.filter(item => item.projectedEndBottles < item.thresholdBottles * 0.5);
            const urgentItems = prepItems.filter(item => item.projectedEndBottles < item.thresholdBottles && item.projectedEndBottles >= item.thresholdBottles * 0.5);
            const normalItems = prepItems.filter(item => item.projectedEndBottles >= item.thresholdBottles);
            
            return (
              <>
                {criticalItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-red-900 to-rose-900 ring-2 ring-red-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-red-800 to-rose-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🔴</span>
                        Critical - {criticalItems.length} item{criticalItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {criticalItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-red-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-red-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {urgentItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-900 to-orange-900 ring-2 ring-amber-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-800 to-orange-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>⚠️</span>
                        Urgent - {urgentItems.length} item{urgentItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {urgentItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-amber-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-amber-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {normalItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 ring-1 ring-blue-700 shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-800 to-indigo-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>📦</span>
                        Regular - {normalItems.length} item{normalItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {normalItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-blue-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-blue-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900/30 to-indigo-900/30 p-4 shadow-md ring-1 ring-slate-700">
          <h3 className="text-base font-bold text-white mb-3">🛍️ Shopping List</h3>
          {data.ingredientTotals.length === 0 ? (
            <p className="text-center text-xs font-semibold text-slate-400">No ingredients needed - all stock levels are good! ✓</p>
          ) : (
            <ul className="grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.ingredientTotals.map((ingredient, idx) => (
                <li 
                  key={`${ingredient.ingredientName}-${ingredient.unit}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-slate-700 text-xs transition-all hover:bg-slate-800"
                >
                  <span className="font-semibold text-white">{ingredient.ingredientName}</span>
                  <span className="font-bold text-blue-300">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}
      </div>

      {/* Production Form Modal */}
      {showProductionForm && data && (
        <ProductionForm
          premixes={data.premixes.map(p => ({
            id: p.sourceCocktailId,
            name: p.name,
            batchYield: p.batchYieldBottles,
          }))}
          onSuccess={() => {
            setShowProductionForm(false);
            loadData();
          }}
          onCancel={() => setShowProductionForm(false)}
        />
      )}
    </div>
  );
}
