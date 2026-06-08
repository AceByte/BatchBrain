"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type TimePoint = {
  date: string;
  production: number;
  consumption: number;
  net: number;
  rollingConsumption: number;
};

type RiskRow = {
  id: number;
  name: string;
  current: number;
  threshold: number;
  target: number;
  batchesToMake: number;
  projectedEndBottles: number;
  runwayDays: number;
  riskLabel: string;
  riskValue: number;
};

type AnalyticsState = {
  activePremixes: DashboardData["premixes"];
  activeCocktails: DashboardData["cocktails"];
  lowStockCount: number;
  criticalCount: number;
  prepBatches: number;
  produced30: number;
  plannedUse30: number;
  netAdjustment30: number;
  balanceGap30: number;
  adjustmentCount: number;
  productionCount: number;
  stockPressure: RiskRow[];
  topPrep: DashboardData["prepPlan"];
  categoryRows: Array<{ category: string; count: number; percent: number }>;
  recentAdjustments: StockAdjustment[];
  recentProduction: ProductionLog[];
  ingredientTotals: DashboardData["ingredientTotals"];
  timeSeries: TimePoint[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${round2(value)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(series: TimePoint[], windowSize = 5) {
  return series.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = series.slice(start, index + 1);
    return {
      ...point,
      rollingConsumption: mean(window.map((entry) => entry.consumption)),
    };
  });
}

function csvQuote(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function MiniStat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <div className="mt-2 text-3xl font-black tracking-tight text-white">{value}</div>
      {hint ? <p className="mt-2 text-sm text-slate-300">{hint}</p> : null}
    </article>
  );
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AnalyticsState | null>(null);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const [dashboardRes, historyRes, productionRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/stock-history?days=30&limit=600", { cache: "no-store" }),
        fetch("/api/production?days=30&limit=1200", { cache: "no-store" }),
      ]);

      if (!dashboardRes.ok) throw new Error("Unable to load dashboard data");
      if (!historyRes.ok) throw new Error("Unable to load stock history");
      if (!productionRes.ok) throw new Error("Unable to load production history");

      const dashboard = (await dashboardRes.json()) as DashboardData;
      const adjustments = (await historyRes.json()) as StockAdjustment[];
      const production = (await productionRes.json()) as ProductionLog[];

      const activePremixes = dashboard.premixes.filter((premix) => !premix.isArchived);
      const activeCocktails = dashboard.cocktails.filter((cocktail) => !cocktail.isArchived);
      const lowStock = activePremixes.filter((premix) => premix.currentBottles <= premix.thresholdBottles);
      const critical = activePremixes.filter((premix) => premix.currentBottles <= premix.thresholdBottles * 0.5);

      const prepBatches = dashboard.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0);
      const produced30 = production.reduce((sum, item) => sum + item.amount, 0);
      const plannedUse30 = dashboard.prepPlan.reduce((sum, item) => sum + (item.weeklyUseBottles / 7) * 30, 0);
      const netAdjustment30 = adjustments.reduce((sum, item) => sum + item.delta, 0);
      const balanceGap30 = produced30 - plannedUse30 + netAdjustment30;

      const categoryCounts = activeCocktails.reduce<Record<string, number>>((acc, cocktail) => {
        acc[cocktail.category] = (acc[cocktail.category] ?? 0) + 1;
        return acc;
      }, {});

      const categoryRows = ["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"].map((category) => ({
        category,
        count: categoryCounts[category] ?? 0,
        percent: pct(categoryCounts[category] ?? 0, activeCocktails.length),
      }));

      const topPrep = [...dashboard.prepPlan].sort((a, b) => b.batchesToMake - a.batchesToMake).slice(0, 6);
      const recentAdjustments = adjustments.slice(0, 8);
      const recentProduction = production.slice(0, 8);

      const stockPressure = activePremixes
        .map((premix) => {
          const prep = dashboard.prepPlan.find((item) => item.premixId === premix.id);
          const weeklyUse = prep?.weeklyUseBottles ?? 0;
          const runwayDays = weeklyUse > 0 ? premix.currentBottles / (weeklyUse / 7) : premix.currentBottles > premix.thresholdBottles ? 99 : 0;
          const riskValue = clamp(
            Math.round((premix.thresholdBottles > 0 ? (1 - premix.currentBottles / premix.thresholdBottles) * 70 : 0) + clamp((10 - runwayDays) * 5, 0, 30)),
            0,
            100,
          );

          let riskLabel = "Stable";
          if (premix.currentBottles <= premix.thresholdBottles * 0.5 || runwayDays <= 2) {
            riskLabel = "Critical";
          } else if (premix.currentBottles <= premix.thresholdBottles || runwayDays <= 5) {
            riskLabel = "High";
          } else if (runwayDays <= 10) {
            riskLabel = "Watch";
          }

          return {
            id: premix.id,
            name: premix.name,
            current: premix.currentBottles,
            threshold: premix.thresholdBottles,
            target: premix.targetBottles,
            batchesToMake: prep?.batchesToMake ?? 0,
            projectedEndBottles: prep?.projectedEndBottles ?? premix.currentBottles,
            runwayDays,
            riskLabel,
            riskValue,
          };
        })
        .sort((a, b) => b.riskValue - a.riskValue)
        .slice(0, 8);

      const timeSeries = movingAverage(
        Array.from({ length: 30 }, (_, offset) => {
          const date = new Date();
          date.setUTCDate(date.getUTCDate() - (29 - offset));
          const key = date.toISOString().slice(0, 10);
          const productionValue = production
            .filter((entry) => entry.date.slice(0, 10) === key)
            .reduce((sum, entry) => sum + entry.amount, 0);
          const consumptionValue = adjustments
            .filter((entry) => entry.delta < 0 && entry.createdAt.slice(0, 10) === key)
            .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);

          return {
            date: key,
            production: productionValue,
            consumption: consumptionValue,
            net: productionValue - consumptionValue,
            rollingConsumption: consumptionValue,
          };
        }),
      );

      setState({
        activePremixes,
        activeCocktails,
        lowStockCount: lowStock.length,
        criticalCount: critical.length,
        prepBatches,
        produced30,
        plannedUse30,
        netAdjustment30,
        balanceGap30,
        adjustmentCount: adjustments.length,
        productionCount: production.length,
        stockPressure,
        topPrep,
        categoryRows,
        recentAdjustments,
        recentProduction,
        ingredientTotals: dashboard.ingredientTotals,
        timeSeries,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const recentConsumption = useMemo(() => {
    if (!state) return 0;
    const last7 = state.timeSeries.slice(-7);
    if (last7.length === 0) return 0;
    return last7.reduce((sum, item) => sum + item.consumption, 0) / last7.length;
  }, [state]);

  const exportCsv = () => {
    if (!state) return;

    const rows: string[] = [];
    rows.push(["date", "production", "consumption", "net", "rollingConsumption"].map(csvQuote).join(","));
    state.timeSeries.forEach((point) => {
      rows.push(
        [
          point.date,
          point.production.toFixed(2),
          point.consumption.toFixed(2),
          point.net.toFixed(2),
          point.rollingConsumption.toFixed(2),
        ]
          .map(csvQuote)
          .join(","),
      );
    });

    rows.push("");
    rows.push(["premix", "current", "threshold", "target", "runwayDays", "riskLabel", "riskValue"].map(csvQuote).join(","));
    state.stockPressure.forEach((row) => {
      rows.push(
        [
          row.name,
          row.current.toFixed(2),
          row.threshold.toFixed(2),
          row.target.toFixed(2),
          row.runwayDays.toFixed(2),
          row.riskLabel,
          row.riskValue.toString(),
        ]
          .map(csvQuote)
          .join(","),
      );
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] px-4 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        <div className="relative w-full max-w-sm rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
          </div>
          <p className="mt-5 text-lg font-semibold tracking-tight">Loading analytics</p>
          <p className="mt-2 text-sm text-slate-300">Building the dashboard from live production, stock, and history data.</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#020617_0%,_#111827_45%,_#1f2937_100%)] p-4 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-rose-400/20 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-300">Analytics unavailable</p>
          <p className="mt-3 text-lg font-bold">{error ?? "Unknown error"}</p>
          <p className="mt-2 text-sm text-slate-300">The page could not assemble the dashboard from the current API responses.</p>
          <button onClick={loadAnalytics} className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Retry load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_33%),linear-gradient(180deg,_#020617_0%,_#0f172a_40%,_#111827_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 md:py-8 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.35)] backdrop-blur-xl md:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0)_100%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300">Operational analytics</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">A cleaner control room for stock, prep, and movement.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                This rebuild focuses on the signals that matter most: what needs production, what is getting tight, and where the process is drifting.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={loadAnalytics} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
                Refresh data
              </button>
              <button onClick={exportCsv} className="rounded-full border border-cyan-300/20 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">
                Export CSV
              </button>
              <Link href="/" className="rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950/60">
                Back to dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Active premixes" value={state.activePremixes.length} hint={`${state.activeCocktails.length} cocktails in the current catalog`} />
          <MiniStat label="Prep batches" value={round2(state.prepBatches)} hint={`${state.lowStockCount} premixes below threshold`} />
          <MiniStat label="30d production" value={round2(state.produced30)} hint={`${state.productionCount} production entries logged`} />
          <MiniStat label="Net movement" value={formatSigned(state.balanceGap30)} hint={`Adjustments: ${round2(state.netAdjustment30)}`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Trend line</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">30-day production vs consumption</h2>
              </div>
              <div className="text-right text-sm text-slate-300">
                <div>Planned daily use: <span className="font-semibold text-white">{round2(state.plannedUse30 / 30)}</span></div>
                <div>Recent 7-day average: <span className="font-semibold text-cyan-300">{round2(recentConsumption)}</span></div>
              </div>
            </div>
            <div className="mt-5 h-[300px] rounded-[1.5rem] border border-white/8 bg-black/20 p-3">
              <ResponsiveContainer>
                <LineChart data={state.timeSeries} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const point = payload[0].payload as TimePoint;
                      return (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-sm text-white shadow-2xl backdrop-blur-xl">
                          <p className="font-semibold text-cyan-200">{formatDate(String(label))}</p>
                          <div className="mt-2 space-y-1 text-slate-300">
                            <div>Production: <span className="font-semibold text-white">{round2(point.production)}</span></div>
                            <div>Consumption: <span className="font-semibold text-white">{round2(point.consumption)}</span></div>
                            <div>Rolling consumption: <span className="font-semibold text-white">{round2(point.rollingConsumption)}</span></div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="production" name="Production" stroke="#38bdf8" strokeWidth={2.4} dot={false} />
                  <Line type="monotone" dataKey="consumption" name="Consumption" stroke="#fb923c" strokeWidth={2.4} dot={false} />
                  <Line type="monotone" dataKey="rollingConsumption" name="Rolling avg" stroke="#facc15" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Stock pressure</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Premixes closest to action</h2>
            <div className="mt-5 space-y-3">
              {state.stockPressure.map((row) => (
                <div key={row.id} className="rounded-[1.4rem] border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Current {round2(row.current)} | Threshold {round2(row.threshold)} | Target {round2(row.target)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{row.riskLabel}</p>
                      <p className="mt-1 text-lg font-black text-white">{row.riskValue}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400" style={{ width: `${clamp(row.riskValue, 8, 100)}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{round2(row.runwayDays)} days runway</span>
                    <span>{row.batchesToMake} batches queued</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Prep queue</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Batches to make now</h2>
            <div className="mt-4 space-y-3">
              {state.topPrep.length === 0 ? (
                <p className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4 text-sm text-slate-300">No active prep pressure right now.</p>
              ) : (
                state.topPrep.map((item) => (
                  <div key={item.premixId} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.premixName}</p>
                      <p className="text-sm font-black text-cyan-300">{item.batchesToMake} batches</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Projected end {round2(item.projectedEndBottles)}</span>
                      <span>Weekly use {round2(item.weeklyUseBottles)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Catalog shape</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Cocktail mix</h2>
            <div className="mt-4 space-y-3">
              {state.categoryRows.map((row) => (
                <div key={row.category} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-white">
                    <span>{row.category}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.max(row.percent, row.count > 0 ? 8 : 0)}%` }} />
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{row.percent}% of active cocktails</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Ingredients</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Current prep totals</h2>
            <div className="mt-4 space-y-3">
              {state.ingredientTotals.length === 0 ? (
                <p className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4 text-sm text-slate-300">No ingredients require prep totals right now.</p>
              ) : (
                state.ingredientTotals.slice(0, 10).map((item) => (
                  <div key={`${item.ingredientName}-${item.unit}`} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.ingredientName}</p>
                      <p className="text-sm font-black text-fuchsia-300">{round2(item.totalAmount)} {item.unit}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Recent movement</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Stock edits and production logs</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Adjustments</p>
                {state.recentAdjustments.length === 0 ? (
                  <p className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4 text-sm text-slate-300">No recent stock adjustments.</p>
                ) : (
                  state.recentAdjustments.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.premixName}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                        </div>
                        <p className={`text-sm font-black ${item.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatSigned(item.delta)}</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{round2(item.oldValue)} → {round2(item.newValue)}</p>
                      {item.notes ? <p className="mt-2 text-xs text-slate-500">{item.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Production</p>
                {state.recentProduction.length === 0 ? (
                  <p className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4 text-sm text-slate-300">No recent production logs.</p>
                ) : (
                  state.recentProduction.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.cocktailName}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.timestamp)}</p>
                        </div>
                        <p className="text-sm font-black text-cyan-300">{round2(item.amount)}</p>
                      </div>
                      {item.notes ? <p className="mt-2 text-xs text-slate-400">{item.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-[0_25px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Balance check</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">30-day operating gap</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Produced</p>
                <p className="mt-2 text-2xl font-black text-white">{round2(state.produced30)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Planned use</p>
                <p className="mt-2 text-2xl font-black text-white">{round2(state.plannedUse30)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gap</p>
                <p className={`mt-2 text-2xl font-black ${state.balanceGap30 >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatSigned(state.balanceGap30)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Positive values suggest production is staying ahead of modeled demand. Negative values point to a gap that should be investigated in prep, usage, or stock adjustments.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
