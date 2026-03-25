"use client";

import { useEffect, useMemo, useState } from "react";

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
  id: number;
  cocktailId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  delta: number;
  notes: string | null;
  createdAt: string;
};

type ProductionLog = {
  id: number;
  date: string;
  cocktailId: string;
  cocktailName: string;
  amount: number;
  timestamp: string;
  notes?: string;
};

type RiskLevel = "CRITICAL" | "HIGH" | "ELEVATED" | "STABLE";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function ceilToQuarter(value: number) {
  return Math.ceil(value * 4) / 4;
}

function riskColor(level: RiskLevel) {
  if (level === "CRITICAL") return "text-rose-300";
  if (level === "HIGH") return "text-amber-300";
  if (level === "ELEVATED") return "text-yellow-300";
  return "text-emerald-300";
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatSigned(value: number) {
  if (value > 0) return `+${value.toFixed(2)}`;
  return value.toFixed(2);
}

function formatUtcTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [production, setProduction] = useState<ProductionLog[]>([]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, historyRes, productionRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/stock-history?days=30&limit=600", { cache: "no-store" }),
        fetch("/api/production?days=30&limit=1200", { cache: "no-store" }),
      ]);

      if (!dashboardRes.ok) {
        throw new Error("Unable to load dashboard metrics");
      }

      if (!historyRes.ok) {
        throw new Error("Unable to load stock adjustment history");
      }

      if (!productionRes.ok) {
        throw new Error("Unable to load production history");
      }

      const dashboardJson = (await dashboardRes.json()) as DashboardData;
      const historyJson = (await historyRes.json()) as StockAdjustment[];
      const productionJson = (await productionRes.json()) as ProductionLog[];

      setData(dashboardJson);
      setAdjustments(historyJson);
      setProduction(productionJson);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const analytics = useMemo(() => {
    if (!data) {
      return null;
    }

    const activePremixes = data.premixes.filter((p) => !p.isArchived);
    const activeCocktails = data.cocktails.filter((c) => !c.isArchived);

    const lowStock = activePremixes.filter((p) => p.currentBottles < p.thresholdBottles);
    const criticalStock = activePremixes.filter((p) => p.currentBottles < p.thresholdBottles * 0.5);
    const totalCurrentBottles = activePremixes.reduce((sum, p) => sum + p.currentBottles, 0);
    const totalTargetBottles = activePremixes.reduce((sum, p) => sum + p.targetBottles, 0);

    const totalWeeklyUse = data.prepPlan.reduce((sum, item) => sum + item.weeklyUseBottles, 0);
    const totalBatchesNeeded = data.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0);
    const totalBottlesToProduce = data.prepPlan.reduce((sum, item) => sum + item.bottlesToProduce, 0);
    const prepItemsNeedingWork = data.prepPlan.filter((item) => item.batchesToMake > 0);

    const topPrep = [...data.prepPlan]
      .sort((a, b) => b.batchesToMake - a.batchesToMake)
      .slice(0, 6);

    const categoryCounts = activeCocktails.reduce<Record<string, number>>((acc, cocktail) => {
      acc[cocktail.category] = (acc[cocktail.category] ?? 0) + 1;
      return acc;
    }, {});

    const categoryRows = ["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"].map((category) => ({
      category,
      count: categoryCounts[category] ?? 0,
      percent: pct(categoryCounts[category] ?? 0, activeCocktails.length),
    }));

    const adjustmentByPremix = adjustments.reduce<
      Record<string, { name: string; count: number; totalAbsDelta: number; netDelta: number }>
    >((acc, entry) => {
      const key = entry.cocktailId;
      if (!acc[key]) {
        acc[key] = { name: entry.premixName, count: 0, totalAbsDelta: 0, netDelta: 0 };
      }
      acc[key].count += 1;
      acc[key].totalAbsDelta += Math.abs(entry.delta);
      acc[key].netDelta += entry.delta;
      return acc;
    }, {});

    const mostAdjustedPremixes = Object.values(adjustmentByPremix)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentAdjustments = adjustments.slice(0, 10);

    const productionByPremix = production.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.cocktailId] = (acc[entry.cocktailId] ?? 0) + entry.amount;
      return acc;
    }, {});

    const adjustmentByPremixRaw = adjustments.reduce<Record<string, StockAdjustment[]>>((acc, entry) => {
      if (!acc[entry.cocktailId]) {
        acc[entry.cocktailId] = [];
      }
      acc[entry.cocktailId].push(entry);
      return acc;
    }, {});

    const riskRows = activePremixes
      .map((premix) => {
        const prep = data.prepPlan.find((item) => item.premixId === premix.id);
        const weeklyUse = prep?.weeklyUseBottles ?? 0;
        const plannedDaily = weeklyUse / 7;
        const entries = adjustmentByPremixRaw[premix.sourceCocktailId] ?? [];
        const negative30 = entries.reduce((sum, entry) => sum + Math.max(0, -entry.delta), 0);
        const negative7 = entries
          .filter((entry) => Date.now() - new Date(entry.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
          .reduce((sum, entry) => sum + Math.max(0, -entry.delta), 0);

        const observedDaily30 = negative30 / 30;
        const observedDaily7 = negative7 / 7;
        const blendedDaily30 = Math.max(0.01, plannedDaily * 0.6 + observedDaily30 * 0.4);
        const blendedDaily7 = Math.max(0.01, plannedDaily * 0.6 + observedDaily7 * 0.4);
        const runwayBottles = Math.max(0, premix.currentBottles - premix.thresholdBottles);
        const daysRemaining = runwayBottles <= 0 ? 0 : runwayBottles / blendedDaily30;

        let riskLevel: RiskLevel = "STABLE";
        if (premix.currentBottles <= premix.thresholdBottles * 0.5 || daysRemaining <= 2) {
          riskLevel = "CRITICAL";
        } else if (daysRemaining <= 5) {
          riskLevel = "HIGH";
        } else if (daysRemaining <= 9) {
          riskLevel = "ELEVATED";
        }

        const divergence = Math.abs(blendedDaily7 - blendedDaily30) / Math.max(blendedDaily30, 0.01);
        const dataPenalty = entries.length < 6 ? 0.15 : entries.length < 12 ? 0.08 : 0;
        const band = clamp(0.2 + divergence * 0.45 + dataPenalty, 0.18, 0.65);
        const lowDays = Math.max(0, daysRemaining * (1 - band));
        const highDays = daysRemaining * (1 + band);
        const trendVs30 = ((blendedDaily7 - blendedDaily30) / Math.max(blendedDaily30, 0.01)) * 100;

        const riskScoreRaw =
          (premix.thresholdBottles > 0
            ? ((premix.thresholdBottles - premix.currentBottles) / premix.thresholdBottles) * 40
            : 0) +
          (daysRemaining <= 0 ? 45 : clamp((10 - daysRemaining) * 4.5, 0, 45)) +
          clamp(divergence * 20, 0, 15);

        return {
          id: premix.id,
          premixId: premix.sourceCocktailId,
          name: premix.name,
          current: premix.currentBottles,
          threshold: premix.thresholdBottles,
          target: premix.targetBottles,
          batchYield: premix.batchYieldBottles,
          weeklyUse,
          blendedDaily30,
          blendedDaily7,
          daysRemaining,
          lowDays,
          highDays,
          trendVs30,
          riskLevel,
          riskScore: clamp(Math.round(riskScoreRaw), 0, 100),
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    const stockoutRiskRows = riskRows.slice(0, 8);

    const prepRecommendations = riskRows
      .map((row) => {
        const baseGap = Math.max(0, row.target - row.current);
        const urgencyReserve = row.daysRemaining < 4 ? row.blendedDaily30 * 2 : row.daysRemaining < 7 ? row.blendedDaily30 : 0;
        const recommendedBottles = Math.max(0, baseGap + urgencyReserve);
        const recommendedBatches = row.batchYield > 0 ? ceilToQuarter(recommendedBottles / row.batchYield) : 0;
        const priority =
          row.riskScore * 0.65 +
          clamp((row.target > 0 ? (recommendedBottles / row.target) * 100 : 0), 0, 35);

        return {
          ...row,
          recommendedBottles,
          recommendedBatches,
          priority: round2(priority),
        };
      })
      .filter((row) => row.recommendedBottles > 0.05)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);

    const volatilityRows = riskRows
      .map((row) => {
        const entries = adjustmentByPremixRaw[row.premixId] ?? [];
        const absDeltas = entries.map((entry) => Math.abs(entry.delta));
        const avgAbs = mean(absDeltas);
        const spread = stdDev(absDeltas);
        const cv = spread / Math.max(avgAbs, 0.1);
        const frequencyPerWeek = entries.length / (30 / 7);
        const score = clamp(cv * 60 + frequencyPerWeek * 8, 0, 100);

        return {
          name: row.name,
          score: Math.round(score),
          avgAbs,
          spread,
          events: entries.length,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const anomalyRows = adjustments
      .map((entry) => {
        const entries = adjustmentByPremixRaw[entry.cocktailId] ?? [];
        const magnitudes = entries.map((item) => Math.abs(item.delta));
        const avgAbs = mean(magnitudes);
        const spread = stdDev(magnitudes);
        const z = spread > 0 ? (Math.abs(entry.delta) - avgAbs) / spread : 0;
        const hour = new Date(entry.createdAt).getUTCHours();
        const offHours = hour < 9 || hour >= 23;
        const cluster24h = entries.filter((item) => {
          const dt = Math.abs(new Date(item.createdAt).getTime() - new Date(entry.createdAt).getTime());
          return dt <= 24 * 60 * 60 * 1000;
        }).length;
        const severe = z >= 2 || (Math.abs(entry.delta) >= Math.max(2, avgAbs * 2.2) && entries.length >= 4);
        if (!severe && !offHours && cluster24h < 4) {
          return null;
        }

        const severity = clamp((z > 0 ? z * 35 : 8) + (offHours ? 18 : 0) + Math.max(0, cluster24h - 3) * 8, 0, 100);
        return {
          id: entry.id,
          name: entry.premixName,
          delta: entry.delta,
          createdAt: entry.createdAt,
          z,
          cluster24h,
          severity: Math.round(severity),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 8);

    const produced30 = production.reduce((sum, entry) => sum + entry.amount, 0);
    const plannedUse30 = data.prepPlan.reduce((sum, item) => sum + (item.weeklyUseBottles / 7) * 30, 0);
    const netAdjustment30 = adjustments.reduce((sum, entry) => sum + entry.delta, 0);
    const negativeAdjustments30 = adjustments.reduce((sum, entry) => sum + Math.max(0, -entry.delta), 0);
    const positiveAdjustments30 = adjustments.reduce((sum, entry) => sum + Math.max(0, entry.delta), 0);
    const balanceGap30 = produced30 - plannedUse30 + netAdjustment30;

    const leakageRows = riskRows
      .map((row) => {
        const premixProduction = productionByPremix[row.premixId] ?? 0;
        const premixPlannedUse = (row.weeklyUse / 7) * 30;
        const entries = adjustmentByPremixRaw[row.premixId] ?? [];
        const premixNetAdj = entries.reduce((sum, entry) => sum + entry.delta, 0);
        const premixLossAdj = entries.reduce((sum, entry) => sum + Math.max(0, -entry.delta), 0);
        const premixGap = premixProduction - premixPlannedUse + premixNetAdj;
        const leakageIndex = Math.max(0, -premixGap);

        return {
          name: row.name,
          leakageIndex,
          gap: premixGap,
          produced: premixProduction,
          plannedUse: premixPlannedUse,
          lossFromAdjustments: premixLossAdj,
        };
      })
      .sort((a, b) => b.leakageIndex - a.leakageIndex)
      .slice(0, 8);

    return {
      activePremixes,
      activeCocktails,
      lowStock,
      criticalStock,
      totalCurrentBottles,
      totalTargetBottles,
      totalWeeklyUse,
      totalBatchesNeeded,
      totalBottlesToProduce,
      prepItemsNeedingWork,
      topPrep,
      categoryRows,
      mostAdjustedPremixes,
      recentAdjustments,
      stockoutRiskRows,
      prepRecommendations,
      volatilityRows,
      anomalyRows,
      leakageRows,
      produced30,
      plannedUse30,
      netAdjustment30,
      negativeAdjustments30,
      positiveAdjustments30,
      balanceGap30,
      ingredientTotals: data.ingredientTotals,
    };
  }, [data, adjustments, production]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/65 p-7 text-center shadow-2xl ring-1 ring-slate-600/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-slate-600">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-500 border-t-blue-300" />
          </div>
          <p className="mt-5 text-base font-bold tracking-wide text-slate-100">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md rounded-3xl bg-slate-900/70 p-7 shadow-2xl ring-1 ring-rose-500/50 backdrop-blur-xl">
          <p className="text-lg font-extrabold text-rose-200">Unable to load analytics</p>
          <p className="mt-2 text-sm font-medium text-rose-100/80">{error ?? "Unknown error"}</p>
          <button
            onClick={loadAnalytics}
            className="mt-5 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">📊 Analytics</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:text-sm">
              Live operational signals from inventory, prep, and adjustments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAnalytics}
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl"
            >
              🔄 Refresh
            </button>
            <a
              href="/"
              className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <article className="group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 p-3 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Premixes</p>
            <p className="mt-0.5 text-xl font-extrabold text-white">{analytics.activePremixes.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Cocktails: {analytics.activeCocktails.length}</p>
          </article>

          <article className="group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 p-3 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Low Stock Pressure</p>
            <p className="mt-0.5 text-xl font-extrabold text-amber-300">{analytics.lowStock.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Critical: {analytics.criticalStock.length}</p>
          </article>

          <article className="group rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 p-3 shadow-md ring-1 ring-blue-700 transition-all hover:shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Prep Needed This Cycle</p>
            <p className="mt-0.5 text-xl font-extrabold text-blue-100">{round2(analytics.totalBatchesNeeded)}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Batches across {analytics.prepItemsNeedingWork.length} premixes</p>
          </article>

          <article className="group rounded-lg bg-gradient-to-br from-green-900 to-emerald-900 p-3 shadow-md ring-1 ring-green-700 transition-all hover:shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-300">30d Adjustments</p>
            <p className="mt-0.5 text-xl font-extrabold text-green-100">{adjustments.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Operational stock edits logged</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6 xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">Top Prep Demand</h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bottles to produce: {round2(analytics.totalBottlesToProduce)}
              </p>
            </div>

            <div className="space-y-2">
              {analytics.topPrep.length === 0 && (
                <p className="rounded-xl bg-slate-800/70 px-3 py-3 text-sm font-semibold text-slate-300">
                  No prep pressure detected right now.
                </p>
              )}

              {analytics.topPrep.map((item) => {
                const fill = Math.min(100, Math.max(8, pct(item.batchesToMake, analytics.totalBatchesNeeded || 1)));
                return (
                  <div key={item.premixId} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-100">{item.premixName}</p>
                      <p className="text-xs font-extrabold text-emerald-300">{item.batchesToMake} batches</p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${fill}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>Weekly use: {round2(item.weeklyUseBottles)}</span>
                      <span>Projected end: {round2(item.projectedEndBottles)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Category Mix</h2>
            <div className="space-y-2">
              {analytics.categoryRows.map((row) => (
                <div key={row.category} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>{row.category}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${Math.max(row.percent, row.count > 0 ? 6 : 0)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.percent}% of active spec sheet</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Stockout Risk Panel</h2>
            <div className="space-y-2">
              {analytics.stockoutRiskRows.map((row) => (
                <div key={row.id} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className={`text-xs font-extrabold ${riskColor(row.riskLevel)}`}>
                      {row.riskLevel} ({row.riskScore})
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Current: {round2(row.current)}</span>
                    <span>Threshold: {round2(row.threshold)}</span>
                    <span>Runway: {round2(row.daysRemaining)}d</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Days Remaining Forecast</h2>
            <div className="space-y-2">
              {analytics.stockoutRiskRows.map((row) => (
                <div key={`${row.id}-forecast`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-blue-300">{round2(row.lowDays)}d - {round2(row.highDays)}d</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Best estimate: {round2(row.daysRemaining)}d</span>
                    <span className={row.trendVs30 > 0 ? "text-rose-300" : "text-emerald-300"}>
                      7d vs 30d: {formatSigned(round2(row.trendVs30))}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Prep Recommendations</h2>
            <div className="space-y-2">
              {analytics.prepRecommendations.length === 0 && (
                <p className="rounded-xl bg-slate-800/70 px-3 py-3 text-sm font-semibold text-slate-300">No prep recommendations right now.</p>
              )}
              {analytics.prepRecommendations.map((row) => (
                <div key={`${row.id}-recommendation`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-emerald-300">Priority {round2(row.priority)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Make {round2(row.recommendedBottles)} bottles</span>
                    <span>{round2(row.recommendedBatches)} batches</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Volatility Score</h2>
            <div className="space-y-2">
              {analytics.volatilityRows.map((row) => (
                <div key={`${row.name}-volatility`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-amber-300">{row.score}/100</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Avg abs delta: {round2(row.avgAbs)}</span>
                    <span>Spread: {round2(row.spread)}</span>
                    <span>{row.events} events</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Adjustment Anomalies</h2>
            <div className="space-y-2">
              {analytics.anomalyRows.length === 0 && (
                <p className="rounded-xl bg-slate-800/70 px-3 py-3 text-sm font-semibold text-slate-300">No unusual adjustments detected.</p>
              )}
              {analytics.anomalyRows.map((row) => (
                <div key={`${row.id}-anomaly`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-rose-300">Severity {row.severity}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Delta: {formatSigned(round2(row.delta))}</span>
                    <span>z-score: {round2(row.z)}</span>
                    <span>24h cluster: {row.cluster24h}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">{formatUtcTimestamp(row.createdAt)}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Waste / Leakage</h2>
            <div className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-300 sm:grid-cols-3">
                <p>Produced 30d: <span className="font-bold text-emerald-300">{round2(analytics.produced30)}</span></p>
                <p>Planned use 30d: <span className="font-bold text-blue-300">{round2(analytics.plannedUse30)}</span></p>
                <p>Net adjustments: <span className="font-bold text-amber-300">{formatSigned(round2(analytics.netAdjustment30))}</span></p>
                <p>Negative adjustments: <span className="font-bold text-rose-300">{round2(analytics.negativeAdjustments30)}</span></p>
                <p>Positive adjustments: <span className="font-bold text-emerald-300">{round2(analytics.positiveAdjustments30)}</span></p>
                <p>Balance gap: <span className={`font-bold ${analytics.balanceGap30 < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatSigned(round2(analytics.balanceGap30))}</span></p>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {analytics.leakageRows.slice(0, 6).map((row) => (
                <div key={`${row.name}-leakage`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-rose-300">Leakage idx {round2(row.leakageIndex)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Gap: {formatSigned(round2(row.gap))}</span>
                    <span>Produced: {round2(row.produced)}</span>
                    <span>Planned: {round2(row.plannedUse)}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Most Adjusted Premixes (30d)</h2>
            <div className="space-y-2">
              {analytics.mostAdjustedPremixes.length === 0 && (
                <p className="rounded-xl bg-slate-800/70 px-3 py-3 text-sm font-semibold text-slate-300">No stock adjustments in this window.</p>
              )}
              {analytics.mostAdjustedPremixes.map((row, index) => (
                <div key={`${row.name}-${index}`} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{row.name}</p>
                    <p className="text-xs font-extrabold text-blue-300">{row.count} edits</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>Abs movement: {round2(row.totalAbsDelta)}</span>
                    <span>Net delta: {formatSigned(round2(row.netDelta))}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
            <h2 className="mb-3 text-lg font-extrabold text-white">Recent Stock Adjustments</h2>
            <div className="space-y-2">
              {analytics.recentAdjustments.length === 0 && (
                <p className="rounded-xl bg-slate-800/70 px-3 py-3 text-sm font-semibold text-slate-300">No recent stock edits found.</p>
              )}
              {analytics.recentAdjustments.map((entry) => (
                <div key={entry.id} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{entry.premixName}</p>
                    <p className={`text-xs font-extrabold ${entry.delta < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                      {formatSigned(entry.delta)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {formatUtcTimestamp(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl bg-slate-800 p-4 shadow-2xl ring-1 ring-slate-700 md:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-white">Ingredient Demand Snapshot</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top totals from current prep plan</p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {analytics.ingredientTotals.slice(0, 12).map((ingredient) => (
              <div
                key={`${ingredient.ingredientName}-${ingredient.unit}`}
                className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-slate-700/70"
              >
                <p className="text-sm font-bold text-slate-100">{ingredient.ingredientName}</p>
                <p className="mt-1 text-xs font-extrabold text-blue-300">
                  {round2(ingredient.totalAmount)} {ingredient.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
