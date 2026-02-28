"use client";

import { useEffect, useState, useMemo } from "react";

type AnalyticsData = {
  productionHistory: Array<{
    id: number;
    date: string;
    cocktailName: string;
    amount: number;
    timestamp: Date;
  }>;
  stockHistory: Array<{
    id: number;
    premixName: string;
    oldValue: number;
    newValue: number;
    delta: number;
    reason: string | null;
    createdAt: Date;
  }>;
};

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [timeframe, setTimeframe] = useState("7");
  const [selectedPremix, setSelectedPremix] = useState<string | "ALL">("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    async function loadData() {
      setLoading(true);
      try {
        const [prodResponse, stockResponse] = await Promise.all([
          fetch(`/api/production?limit=${timeframe}`),
          fetch(`/api/stock-history?limit=${timeframe}`),
        ]);
        
        const production = await prodResponse.json();
        const stock = await stockResponse.json();
        
        setData({
          productionHistory: production,
          stockHistory: stock,
        });
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [timeframe, mounted]);

  // Advanced analytics calculations
  const analytics = useMemo(() => {
    if (!data) return null;

    // Filter by selected premix
    const filteredProduction = selectedPremix === "ALL" 
      ? data.productionHistory 
      : data.productionHistory.filter(p => p.cocktailName === selectedPremix);

    const filteredStock = selectedPremix === "ALL"
      ? data.stockHistory
      : data.stockHistory.filter(s => s.premixName === selectedPremix);

    // Top premixes by production volume
    const premixProduction = new Map<string, { volume: number; batches: number }>();
    data.productionHistory.forEach(p => {
      const current = premixProduction.get(p.cocktailName) || { volume: 0, batches: 0 };
      premixProduction.set(p.cocktailName, {
        volume: current.volume + p.amount,
        batches: current.batches + 1,
      });
    });
    const topPremixes = Array.from(premixProduction.entries())
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 5);

    // Stock adjustment reasons breakdown
    const reasonBreakdown = new Map<string, { count: number; totalChange: number }>();
    data.stockHistory.forEach(s => {
      const reason = s.reason || "Unknown";
      const current = reasonBreakdown.get(reason) || { count: 0, totalChange: 0 };
      reasonBreakdown.set(reason, {
        count: current.count + 1,
        totalChange: current.totalChange + s.delta,
      });
    });
    const reasonStats = Array.from(reasonBreakdown.entries())
      .sort((a, b) => b[1].count - a[1].count);

    // Production velocity (per day in timeframe)
    const days = parseInt(timeframe);
    const totalProduced = filteredProduction.reduce((sum, p) => sum + p.amount, 0);
    const productionVelocity = (totalProduced / Math.max(days, 1)).toFixed(2);

    // Average batch size
    const avgBatchSize = filteredProduction.length > 0 
      ? (totalProduced / filteredProduction.length).toFixed(2)
      : "0.00";

    // Stock activity (most adjusted premixes)
    const stockActivity = new Map<string, { adjustments: number; netChange: number }>();
    filteredStock.forEach(s => {
      const current = stockActivity.get(s.premixName) || { adjustments: 0, netChange: 0 };
      stockActivity.set(s.premixName, {
        adjustments: current.adjustments + 1,
        netChange: current.netChange + s.delta,
      });
    });
    const mostAdjusted = Array.from(stockActivity.entries())
      .sort((a, b) => b[1].adjustments - a[1].adjustments)
      .slice(0, 5);

    // Net change by direction
    const netPositive = filteredStock.filter(s => s.delta > 0).reduce((sum, s) => sum + s.delta, 0);
    const netNegative = filteredStock.filter(s => s.delta < 0).reduce((sum, s) => sum + Math.abs(s.delta), 0);

    return {
      totalProduced: totalProduced.toFixed(2),
      totalBatches: filteredProduction.length,
      totalAdjustments: filteredStock.length,
      productionVelocity,
      avgBatchSize,
      topPremixes,
      reasonStats,
      mostAdjusted,
      netPositive: netPositive.toFixed(2),
      netNegative: netNegative.toFixed(2),
    };
  }, [data, selectedPremix]);

  function exportToCSV() {
    if (!data) return;
    
    const prodCSV = [
      ["Date", "Premix", "Amount (bottles)", "Timestamp"],
      ...data.productionHistory.map(p => [
        p.date,
        p.cocktailName,
        p.amount.toString(),
        new Date(p.timestamp).toLocaleString(),
      ]),
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([prodCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div>
          <p className="mt-4 text-xl font-semibold text-slate-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-xl font-semibold text-red-400">Failed to load analytics</div>
      </div>
    );
  }

  const premixOptions = ["ALL", ...new Set(data.productionHistory.map(p => p.cocktailName))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-5xl font-extrabold text-white">📊 Analytics</h1>
          <div className="flex gap-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white ring-1 ring-slate-700 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <select
              value={selectedPremix}
              onChange={(e) => setSelectedPremix(e.target.value as any)}
              className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white ring-1 ring-slate-700 transition-all hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {premixOptions.map(p => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All Premixes" : p}
                </option>
              ))}
            </select>
            <button
              onClick={exportToCSV}
              className="rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl"
            >
              📥 Export to CSV
            </button>
            <a
              href="/"
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-600 hover:shadow-xl"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 p-6 shadow-xl ring-1 ring-blue-700">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Production Velocity</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{analytics.productionVelocity}</p>
            <p className="mt-1 text-xs font-semibold text-blue-200">bottles/day</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-900 to-purple-800 p-6 shadow-xl ring-1 ring-purple-700">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300">Avg Batch Size</p>
            <p className="mt-2 text-4xl font-extrabold text-white">{analytics.avgBatchSize}</p>
            <p className="mt-1 text-xs font-semibold text-purple-200">bottles/batch</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-900 to-emerald-800 p-6 shadow-xl ring-1 ring-green-700">
            <p className="text-xs font-bold uppercase tracking-wider text-green-300">Positive Adjustments</p>
            <p className="mt-2 text-4xl font-extrabold text-white">+{analytics.netPositive}</p>
            <p className="mt-1 text-xs font-semibold text-green-200">bottles added</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-red-900 to-rose-800 p-6 shadow-xl ring-1 ring-red-700">
            <p className="text-xs font-bold uppercase tracking-wider text-red-300">Negative Adjustments</p>
            <p className="mt-2 text-4xl font-extrabold text-white">-{analytics.netNegative}</p>
            <p className="mt-1 text-xs font-semibold text-red-200">bottles removed</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 shadow-xl ring-1 ring-slate-600">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-400">Total Produced</p>
            <p className="mt-3 text-5xl font-extrabold text-white">{analytics.totalProduced}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">bottles</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 shadow-xl ring-1 ring-slate-600">
            <p className="text-sm font-bold uppercase tracking-wider text-green-400">Production Batches</p>
            <p className="mt-3 text-5xl font-extrabold text-white">
              {analytics.totalBatches}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-400">logged</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 shadow-xl ring-1 ring-slate-600">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-400">Stock Adjustments</p>
            <p className="mt-3 text-5xl font-extrabold text-white">{analytics.totalAdjustments}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">changes</p>
          </div>
        </div>

        {/* Top Performers and Insights */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Top Premixes */}
          <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
            <h2 className="mb-6 text-2xl font-extrabold text-white">🏆 Top Premixes</h2>
            <div className="space-y-4">
              {analytics.topPremixes.length > 0 ? (
                analytics.topPremixes.map(([name, stats], idx) => (
                  <div key={name} className="rounded-lg bg-slate-900/70 p-4 ring-1 ring-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-blue-400">#{idx + 1}</p>
                        <p className="mt-1 font-bold text-white">{name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-green-400">{stats.volume.toFixed(2)}</p>
                        <p className="text-xs font-semibold text-slate-400">{stats.batches} batches</p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                        style={{ width: `${(stats.volume / (analytics.topPremixes[0]?.[1].volume || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No production data</p>
              )}
            </div>
          </section>

          {/* Adjustment Reasons */}
          <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
            <h2 className="mb-6 text-2xl font-extrabold text-white">📋 Adjustment Reasons</h2>
            <div className="space-y-4">
              {analytics.reasonStats.length > 0 ? (
                analytics.reasonStats.map(([reason, stats]) => (
                  <div key={reason} className="rounded-lg bg-slate-900/70 p-4 ring-1 ring-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white">{reason}</p>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-amber-400">{stats.count}</p>
                        <p className={`text-xs font-semibold ${stats.totalChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stats.totalChange > 0 ? '+' : ''}{stats.totalChange.toFixed(2)} bottles
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-600"
                        style={{ width: `${(stats.count / (analytics.reasonStats[0]?.[1].count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No adjustment history</p>
              )}
            </div>
          </section>
        </div>

        {/* Most Adjusted Premixes */}
        <section className="mb-8 rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
          <h2 className="mb-6 text-2xl font-extrabold text-white">⚙️ Most Adjusted Premixes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {analytics.mostAdjusted.length > 0 ? (
              analytics.mostAdjusted.map(([name, stats], idx) => (
                <div key={name} className="rounded-lg bg-slate-900/70 p-4 ring-1 ring-slate-700">
                  <p className="text-xs font-bold text-slate-400">#{idx + 1}</p>
                  <p className="mt-2 font-bold text-white">{name}</p>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold">{stats.adjustments}</span>
                      <span className="text-xs text-slate-400"> adjustments</span>
                    </p>
                    <p className={`text-sm font-bold ${stats.netChange > 0 ? 'text-green-400' : stats.netChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {stats.netChange > 0 ? '+' : ''}{stats.netChange.toFixed(1)} net
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-slate-400">No adjustment data</p>
            )}
          </div>
        </section>

        {/* Production History */}
        <section className="mb-8 rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
          <h2 className="mb-6 text-3xl font-extrabold text-white">📦 Production History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-700 text-left text-xs font-bold uppercase tracking-wider text-blue-400">
                  <th className="pb-4 pr-6">Date</th>
                  <th className="pb-4 pr-6">Premix</th>
                  <th className="pb-4 pr-6">Amount</th>
                  <th className="pb-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPremix === "ALL" ? data.productionHistory : data.productionHistory.filter(p => p.cocktailName === selectedPremix)).map((item) => (
                  <tr key={item.id} className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/50">
                    <td className="py-4 pr-6 font-semibold text-slate-300">{item.date}</td>
                    <td className="py-4 pr-6 font-bold text-white">
                      {item.cocktailName}
                    </td>
                    <td className="py-4 pr-6 font-extrabold text-green-400">
                      +{item.amount.toFixed(2)} bottles
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {(selectedPremix === "ALL" ? data.productionHistory : data.productionHistory.filter(p => p.cocktailName === selectedPremix)).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-lg font-semibold text-slate-500">
                      No production history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Stock Adjustment History */}
        <section className="rounded-3xl bg-slate-800 p-8 shadow-2xl ring-1 ring-slate-700">
          <h2 className="mb-6 text-3xl font-extrabold text-white">📝 Stock Adjustment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-700 text-left text-xs font-bold uppercase tracking-wider text-blue-400">
                  <th className="pb-4 pr-6">Premix</th>
                  <th className="pb-4 pr-6">Old Value</th>
                  <th className="pb-4 pr-6">New Value</th>
                  <th className="pb-4 pr-6">Change</th>
                  <th className="pb-4 pr-6">Reason</th>
                  <th className="pb-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPremix === "ALL" ? data.stockHistory : data.stockHistory.filter(s => s.premixName === selectedPremix)).map((item) => (
                  <tr key={item.id} className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/50">
                    <td className="py-4 pr-6 font-bold text-white">
                      {item.premixName}
                    </td>
                    <td className="py-4 pr-6 font-semibold text-slate-400">
                      {item.oldValue.toFixed(2)}
                    </td>
                    <td className="py-4 pr-6 font-semibold text-slate-300">
                      {item.newValue.toFixed(2)}
                    </td>
                    <td className={`py-4 pr-6 font-extrabold ${item.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.delta > 0 ? '+' : ''}{item.delta.toFixed(2)}
                    </td>
                    <td className="py-4 pr-6 text-sm font-medium text-slate-400">
                      {item.reason || 'N/A'}
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(selectedPremix === "ALL" ? data.stockHistory : data.stockHistory.filter(s => s.premixName === selectedPremix)).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-lg font-semibold text-slate-500">
                      No adjustment history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
