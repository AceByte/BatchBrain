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
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
          <p className="mt-4 text-lg font-bold tracking-tight">Loading analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">Building the dashboard from live production data...</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-8 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Analytics unavailable</p>
          <p className="mt-2 text-lg font-bold">{error ?? "Unknown error"}</p>
          <p className="mt-1 text-sm text-muted-foreground">The page could not assemble the dashboard from the current API responses.</p>
          <button onClick={loadAnalytics} className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Retry load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-border pb-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight">Operational Analytics</h1>
            <p className="mt-2 text-muted-foreground">
              A cleaner control room for stock, prep, and movement. Focus on the signals that matter most: what needs production and what is getting tight.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={loadAnalytics} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              Refresh
            </button>
            <button onClick={exportCsv} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
              Export CSV
            </button>
            <Link href="/" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Active Premixes" value={state.activePremixes.length} hint={`${state.activeCocktails.length} cocktails active`} />
          <MiniStat label="Prep Batches" value={round2(state.prepBatches)} hint={`${state.lowStockCount} items below threshold`} />
          <MiniStat label="30d Production" value={round2(state.produced30)} hint={`${state.productionCount} logs recorded`} />
          <MiniStat label="Net Movement" value={formatSigned(state.balanceGap30)} hint={`Total delta: ${round2(state.netAdjustment30)}`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Production vs Consumption</h2>
                <p className="text-sm text-muted-foreground mt-0.5">30-day trend line and rolling average</p>
              </div>
              <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground space-y-0.5">
                <div>Daily Use Score: <span className="font-bold text-foreground">{round2(state.plannedUse30 / 30)}</span></div>
                <div>7-Day Average: <span className="font-bold text-primary">{round2(recentConsumption)}</span></div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={state.timeSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted)/0.5)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }: { active?: boolean; payload?: readonly any[]; label?: any }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const point = payload[0].payload as TimePoint;
                      return (
                        <div className="rounded-md border border-border bg-background p-3 text-xs shadow-md">
                          <p className="font-bold border-b border-border pb-1.5 mb-1.5">{formatDate(String(label))}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Production:</span>
                              <span className="font-medium">{round2(point.production)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Consumption:</span>
                              <span className="font-medium">{round2(point.consumption)}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-border pt-1 mt-1 text-primary">
                              <span className="font-bold">Rolling Avg:</span>
                              <span className="font-bold">{round2(point.rollingConsumption)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="production" name="Production" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="consumption" name="Consumption" stroke="hsl(var(--destructive)/0.7)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="rollingConsumption" name="Rolling Avg" stroke="hsl(var(--secondary-foreground)/0.5)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden">
            <h2 className="text-xl font-bold tracking-tight">Stock Pressure</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Items requiring attention</p>
            <div className="mt-6 space-y-4">
              {state.stockPressure.map((row) => (
                <div key={row.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {round2(row.current)} / {round2(row.target)} jars
                      </p>
                    </div>
                    <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${row.riskLabel === 'Critical' ? 'bg-destructive/10 text-destructive' :
                      row.riskLabel === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-primary/10 text-primary'
                      }`}>
                      {row.riskLabel}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${row.riskValue > 70 ? 'bg-destructive' : row.riskValue > 40 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                      style={{ width: `${clamp(row.riskValue, 5, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <span>{round2(row.runwayDays)} days runway</span>
                    <span>{row.batchesToMake} in queue</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight mb-4">Prep Queue</h2>
            <div className="space-y-2">
              {state.topPrep.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">No active prep pressure.</p>
              ) : (
                state.topPrep.map((item) => (
                  <div key={item.premixId} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30">
                    <div className="max-w-[70%]">
                      <p className="text-sm font-bold truncate">{item.premixName}</p>
                      <p className="text-[10px] text-muted-foreground">Weekly use: {round2(item.weeklyUseBottles)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{item.batchesToMake}</p>
                      <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">batches</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight mb-4">Catalog Shapes</h2>
            <div className="space-y-3">
              {state.categoryRows.map((row) => (
                <div key={row.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.category}</span>
                    <span className="text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary/70" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight mb-4">Ingredient Totals</h2>
            <div className="space-y-2">
              {state.ingredientTotals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">No active prep totals.</p>
              ) : (
                state.ingredientTotals.slice(0, 8).map((item) => (
                  <div key={`${item.ingredientName}-${item.unit}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-medium">{item.ingredientName}</p>
                    <p className="text-sm font-bold">{round2(item.totalAmount)} <span className="text-[10px] text-muted-foreground uppercase font-medium">{item.unit}</span></p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Movement Log</h2>
              <div className="h-px flex-1 bg-border mx-4" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Latest 16 entries</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 pb-1 border-b border-border mb-2 text-center">Adjustments</p>
                {state.recentAdjustments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No recent edits.</p>
                ) : (
                  state.recentAdjustments.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-background p-3 text-xs">
                      <div className="flex justify-between gap-2 mb-2">
                        <span className="font-bold truncate">{item.premixName}</span>
                        <span className={`font-black ${item.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatSigned(item.delta)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{formatDate(item.createdAt)}</span>
                        <span>{round2(item.oldValue)} → {round2(item.newValue)}</span>
                      </div>
                      {item.notes && <p className="mt-2 text-[10px] text-muted-foreground italic truncate border-t border-border pt-1">"{item.notes}"</p>}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 pb-1 border-b border-border mb-2 text-center">Batch Production</p>
                {state.recentProduction.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No production logs.</p>
                ) : (
                  state.recentProduction.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-background p-3 text-xs">
                      <div className="flex justify-between gap-2 mb-2">
                        <span className="font-bold truncate">{item.cocktailName}</span>
                        <span className="font-black text-primary">+{round2(item.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>Logged entry</span>
                      </div>
                      {item.notes && <p className="mt-2 text-[10px] text-muted-foreground italic truncate border-t border-border pt-1">"{item.notes}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold tracking-tight">Operating Summary</h2>
            <p className="text-sm text-muted-foreground mt-0.5">30-day balance vs modeled demand</p>
            <div className="mt-8 grid gap-4 grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Produced</p>
                <p className="text-2xl font-black">{round2(state.produced30)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Model Use</p>
                <p className="text-2xl font-black">{round2(state.plannedUse30)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card shadow-inner p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">30d Gap</p>
                <p className={`text-2xl font-black ${state.balanceGap30 >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatSigned(state.balanceGap30)}
                </p>
              </div>
            </div>
            <div className="mt-auto pt-8">
              <div className="rounded-lg bg-muted/40 p-4 border border-border">
                <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                  <span className="font-bold text-foreground">Pro-tip:</span> Positive values suggest production is satisfying modeled demand. Negative values indicate a persistent gap that requires deeper review of prep, waste, or consumption modeling.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
