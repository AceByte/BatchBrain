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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Draft/edit mode
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("Manual adjustment");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [selectedPremixes, setSelectedPremixes] = useState<Set<number>>(new Set());
  
  // UI state
  const [cocktailSearch, setCocktailSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "REGULAR" | "SEASONAL" | "SIGNATURE">("ALL");
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
        c.premixItems.some(p => p.premixName.toLowerCase().includes(search))
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
        const ingredientCount = cocktail.premixItems.length + (cocktail.serveExtras ? 1 : 0);
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
          <p className="mt-6 text-xl font-bold text-slate-700">Loading BatchBrain data...</p>
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
          <p className="mt-4 text-base font-medium text-red-700">{error ?? "Unknown error"}</p>
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
      <div className="mx-auto flex w-full flex-col gap-8 p-4 md:p-6 lg:p-8">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl disabled:opacity-50"
              title="Refresh data (F5)"
            >
              🔄 Refresh
            </button>
            {lastUpdated && (
              <span className="text-sm font-medium text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <a
            href="/analytics"
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl"
          >
            📊 Analytics
          </a>
        </div>

        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-8 shadow-xl print:border-slate-300 print:bg-white print:text-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight text-white print:text-slate-900">BatchBrain</h1>
              <p className="mt-3 text-lg font-medium text-blue-100 print:text-slate-600">
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
                  <span>{pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''} · Press Ctrl+S to save or Esc to discard</span>
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 shadow-xl ring-1 ring-slate-600 transition-all hover:shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Premixes</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{data?.premixes.length ?? 0}</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-6 shadow-xl ring-1 ring-slate-600 transition-all hover:shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Cocktails</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{data?.cocktails.length ?? 0}</p>
          </div>
          <div className="group rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 p-6 shadow-xl ring-1 ring-blue-700 transition-all hover:shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Batches Needed</p>
            <p className="mt-2 text-4xl font-extrabold text-blue-100">
              {data?.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0) ?? 0}
            </p>
          </div>
          <div className={`group rounded-2xl p-6 shadow-xl ring-1 transition-all hover:shadow-2xl ${
            lowPremixCount > 0 
              ? 'bg-gradient-to-br from-red-900 to-rose-900 ring-red-700' 
              : 'bg-gradient-to-br from-green-900 to-emerald-900 ring-green-700'
          }`}>
            <p className={`text-sm font-semibold uppercase tracking-wider ${
              lowPremixCount > 0 ? 'text-red-300' : 'text-green-300'
            }`}>Low Stock Items</p>
            <p className={`mt-2 text-4xl font-extrabold ${
              lowPremixCount > 0 ? 'text-red-100' : 'text-green-100'
            }`}>
              {lowPremixCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 p-3 shadow-lg ring-1 ring-slate-700 print:hidden">
          <button
            onClick={() => setCurrentView(viewOrder[(currentViewIndex - 1 + viewOrder.length) % viewOrder.length])}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current View</p>
            <p className="text-lg font-extrabold text-white">{viewTitles[currentView]}</p>
          </div>
          <button
            onClick={() => setCurrentView(viewOrder[(currentViewIndex + 1) % viewOrder.length])}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600"
          >
            →
          </button>
        </div>

      {currentView === "inventory" && (
      <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-white">💧 Premix Inventory</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProductionForm(true)}
              className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg print:hidden"
            >
              📦 Log Production
            </button>
            <label className="text-sm font-semibold text-slate-300">Sort by:</label>
            <select 
              value={premixSortBy}
              onChange={(e) => setPremixSortBy(e.target.value as any)}
              className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">Ingredients:</p>
                          <ul className="space-y-0.5">
                            {premix.recipeItems.map((item, itemIndex) => (
                              <li
                                key={`${premix.id}-${item.ingredientName}-${itemIndex}`}
                                className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-xs leading-5"
                              >
                                <span className="font-semibold text-slate-100">{item.ingredientName}</span>
                                <span className="font-extrabold text-blue-300">{item.amountPerBatch}{item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className={`grid grid-cols-2 gap-2 text-xs ${premix.recipeItems.length === 0 ? 'md:col-span-2' : ''}`}>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-[10px] font-bold text-slate-400">Current</p>
                          <p className={`text-sm font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-200'}`}>
                            {premix.currentBottles.toFixed(2)}
                            {hasChange && (
                              <span className="text-[10px] text-slate-500 ml-1">({originalValue.toFixed(2)})</span>
                            )}
                          </p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-[10px] font-bold text-slate-400">Threshold</p>
                          <p className="text-sm font-bold text-slate-300">{premix.thresholdBottles.toFixed(2)}</p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-[10px] font-bold text-slate-400">Target</p>
                          <p className="text-sm font-bold text-slate-300">{premix.targetBottles.toFixed(2)}</p>
                        </div>
                        <div className="rounded-md bg-slate-800/80 p-1.5">
                          <p className="text-[10px] font-bold text-slate-400">Batch Yield</p>
                          <p className="text-sm font-bold text-slate-300">{premix.batchYieldBottles.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-center gap-1 print:hidden">
                      <button
                        className="rounded-lg bg-gradient-to-br from-red-500 to-rose-600 px-2 py-1 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        onClick={() => adjustStock(premix.id, -5)}
                      >
                        -5
                      </button>
                      <button
                        className="rounded-lg bg-gradient-to-br from-red-400 to-red-500 px-2 py-1 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        onClick={() => adjustStock(premix.id, -1)}
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={pendingChanges.get(premix.id) ?? (data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0)}
                        onChange={(e) => setStockValue(premix.id, Number(e.target.value))}
                        className="w-14 rounded-lg bg-slate-700 px-2 py-1 text-center text-xs font-bold text-white shadow-sm ring-1 ring-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        className="rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 px-2 py-1 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        onClick={() => adjustStock(premix.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 px-2 py-1 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
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
      <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-white">🍸 Cocktail Specsheet</h2>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search cocktails..."
            value={cocktailSearch}
            onChange={(e) => setCocktailSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl bg-slate-700 px-5 py-3 text-sm text-white ring-1 ring-slate-600 transition-all placeholder:text-slate-400 focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            {["ALL", "REGULAR", "SEASONAL", "SIGNATURE"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat as any)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
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
        <div className="mt-2 text-sm font-medium text-slate-400">
          Showing {filteredCocktails.length} of {data?.cocktails.length ?? 0} cocktails
        </div>
        {filteredCocktails.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-10 text-center ring-1 ring-slate-600">
            <p className="text-xl font-bold text-slate-300">No cocktails found</p>
            <p className="mt-2 text-base font-medium text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCocktails.map((cocktail) => {
            const categoryColors = {
              REGULAR: 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 ring-blue-700/50',
              SEASONAL: 'bg-gradient-to-r from-purple-900/40 to-purple-800/20 ring-purple-700/50',
              SIGNATURE: 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 ring-amber-700/50',
            };
            const categoryBadgeColors = {
              REGULAR: 'bg-gradient-to-br from-blue-900 to-blue-800 text-blue-200 ring-1 ring-blue-700',
              SEASONAL: 'bg-gradient-to-br from-purple-900 to-purple-800 text-purple-200 ring-1 ring-purple-700',
              SIGNATURE: 'bg-gradient-to-br from-amber-900 to-amber-800 text-amber-200 ring-1 ring-amber-700',
            };
            const categoryEmoji = {
              REGULAR: '🥃',
              SEASONAL: '🌸',
              SIGNATURE: '⭐',
            };
            const premixRows = cocktail.premixItems.map((premixItem, idx) => ({
              premixItem,
              idx,
              premixSpec: premixSpecsByName.get(premixItem.premixName.toLowerCase().trim()),
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
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${categoryBadgeColors[cocktail.category]}`}>
                        <span>{categoryEmoji[cocktail.category]}</span>
                        {formatCategory(cocktail.category)}
                      </span>
                      {cocktail.isBatched && (
                        <div className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-br from-green-900 to-emerald-900 px-1.5 py-0.5 text-[10px] font-bold text-green-200 ring-1 ring-green-700">
                          <span>📦</span>
                          Batched
                        </div>
                      )}
                    </div>
                    
                    {/* Cocktail Details (Glass, Technique, Garnish) */}
                    {(cocktail.glassware || cocktail.technique || cocktail.garnish) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Details</p>
                        <ul className="space-y-1">
                          {cocktail.glassware && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">🍷 Glass</span>
                                <span className="font-extrabold text-blue-300">{cocktail.glassware}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.technique && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">🔧 Technique</span>
                                <span className="font-extrabold text-blue-300">{cocktail.technique}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.garnish && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">🌿 Garnish</span>
                                <span className="font-extrabold text-blue-300">{cocktail.garnish}</span>
                              </div>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Premix Breakdown - Only for batched cocktails */}
                    {cocktail.isBatched && premixRows.length > 0 && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Premix</p>
                        <div className="space-y-1.5">
                          {premixRows.map(({ premixItem, idx, premixSpec }) => (
                            <div
                              key={`${cocktail.id}-premix-${premixItem.premixName}-${idx}`}
                              className="rounded-md bg-slate-800/70 p-1.5"
                            >
                              <div className="mb-1 flex items-center justify-between text-xs leading-5">
                                <span className="font-bold text-emerald-300">{premixItem.premixName}</span>
                                <span className="font-semibold text-blue-300">{premixItem.amountPerDrinkMl}ml</span>
                              </div>
                              {premixSpec && premixSpec.recipeItems.length > 0 && (
                                <ul className="space-y-0.5 border-t border-slate-700/80 pt-1">
                                  {premixSpec.recipeItems.map((recipeItem, recipeIndex) => (
                                    <li
                                      key={`${cocktail.id}-premix-recipe-${premixItem.premixName}-${recipeItem.ingredientName}-${recipeIndex}`}
                                      className="flex items-center justify-between rounded bg-slate-900/50 px-1 py-0.5 text-[9px] leading-3"
                                    >
                                      <span className="text-slate-300">{recipeItem.ingredientName}</span>
                                      <span className="font-semibold text-blue-200">{recipeItem.amountPerBatch}{recipeItem.unit}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ingredients */}
                    {(premixRows.length > 0 || cocktail.serveExtras) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Ingredients</p>
                        <ul className="space-y-1">
                          {premixRows.map(({ premixItem, idx, premixSpec }) => (
                            <li
                              key={`${cocktail.id}-${premixItem.premixName}-${idx}`}
                              className="rounded-md bg-slate-800/70 px-2 py-1"
                            >
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">{premixItem.premixName}</span>
                                <span className="font-extrabold text-blue-300">{premixItem.amountPerDrinkMl}ml</span>
                              </div>
                              {premixSpec && premixSpec.recipeItems.length > 0 && (
                                <ul className="mt-1 space-y-0.5 border-t border-slate-700/80 pt-1">
                                  {premixSpec.recipeItems.map((recipeItem, recipeIndex) => (
                                    <li
                                      key={`${cocktail.id}-${premixItem.premixName}-${recipeItem.ingredientName}-${recipeIndex}`}
                                      className="flex items-center justify-between rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] leading-4"
                                    >
                                      <span className="text-slate-200">{recipeItem.ingredientName}</span>
                                      <span className="font-semibold text-blue-200">{recipeItem.amountPerBatch}{recipeItem.unit}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                          {cocktail.serveExtras && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Extra</span>
                                <span className="font-extrabold text-blue-300">{cocktail.serveExtras}</span>
                              </div>
                            </li>
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
      <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-white">📋 Prep List (This Week)</h2>
        </div>

        {data.prepPlan.filter(item => item.batchesToMake > 0).length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-green-900 to-emerald-900 p-8 text-center ring-1 ring-green-700">
            <p className="text-xl font-bold text-green-200">✓ All stock levels are good!</p>
            <p className="mt-2 text-sm font-medium text-green-300">No prep needed this week.</p>
          </div>
        ) : (
        <div className="mt-6 space-y-5">
          {data.prepPlan.filter(item => item.batchesToMake > 0).map((item) => {
            const needsPrep = item.batchesToMake > 0;
            const isUrgent = item.projectedEndBottles < item.thresholdBottles;
            const isCritical = item.projectedEndBottles < item.thresholdBottles * 0.5;
            
            const cardClass = isCritical
              ? 'bg-gradient-to-br from-red-900 to-rose-900 ring-2 ring-red-700 shadow-lg'
              : isUrgent
              ? 'bg-gradient-to-br from-amber-900 to-orange-900 ring-2 ring-amber-700 shadow-lg'
              : needsPrep
              ? 'bg-gradient-to-br from-blue-900 to-indigo-900 ring-1 ring-blue-700 shadow-md'
              : 'bg-gradient-to-br from-slate-900 to-slate-800 ring-1 ring-slate-700';
            
            return (
              <article key={item.premixId} className={`rounded-2xl p-6 transition-all hover:shadow-xl ${cardClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isCritical && <span className="text-3xl">🔴</span>}
                    {isUrgent && !isCritical && <span className="text-3xl">⚠️</span>}
                    {!isUrgent && <span className="text-3xl">📦</span>}
                    <h3 className="text-xl font-extrabold text-white">{item.premixName}</h3>
                  </div>
                  <div className={`rounded-2xl px-6 py-4 text-center shadow-lg ${isCritical ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white' : isUrgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">Make</p>
                    <p className="text-3xl font-black">{item.batchesToMake}</p>
                    <p className="text-xs opacity-90">batch{item.batchesToMake !== 1 ? 'es' : ''} ({item.bottlesToProduce.toFixed(2)} bottles)</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-slate-900/70 p-5 text-xs shadow-inner backdrop-blur-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{item.currentBottles.toFixed(2)} bottles</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Use</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{item.weeklyUseBottles.toFixed(2)} bottles</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Projected End</p>
                    <p className={`mt-1 text-xl font-extrabold ${
                      isCritical ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white'
                    }`}>
                      {item.projectedEndBottles.toFixed(2)} bottles
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Threshold</p>
                    <p className="mt-1 text-xl font-extrabold text-white">{item.thresholdBottles.toFixed(2)} bottles</p>
                  </div>
                </div>
                {item.ingredients.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Ingredients Needed:</p>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {item.ingredients.map((ingredient, idx) => (
                        <li 
                          key={`${item.premixId}-${ingredient.ingredientName}-${idx}`}
                          className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm shadow-sm ring-1 ring-slate-700 transition-all hover:shadow-md"
                        >
                          <span className="text-xl">🔹</span>
                          <span className="font-bold text-white">{ingredient.ingredientName}:</span>
                          <span className="font-semibold text-slate-300">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
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

        <div className="mt-8 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900/30 to-indigo-900/30 p-6 shadow-md ring-1 ring-slate-700">
          <h3 className="text-2xl font-bold text-white">🛍️ Ingredients Shopping List</h3>
          {data.ingredientTotals.length === 0 ? (
            <p className="mt-4 text-center text-lg font-semibold text-slate-300">No ingredients needed - all stock levels are good! ✓</p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.ingredientTotals.map((ingredient, idx) => (
                <li 
                  key={`${ingredient.ingredientName}-${ingredient.unit}-${idx}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-800 px-5 py-4 shadow-md ring-1 ring-slate-700 transition-all hover:shadow-lg"
                >
                  <span className="text-2xl">📦</span>
                  <span className="font-bold text-white">{ingredient.ingredientName}:</span>
                  <span className="font-extrabold text-blue-400">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
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
