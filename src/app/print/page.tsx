"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChangeLogReport,
  SpecSheetReport,
  PrepSpecReport,
  InventorySnapshotReport,
} from "@/components/print-reports";

type ReportType =
  | "changelog"
  | "specs"
  | "prepspec"
  | "inventory"
  | "combined";

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

const PAPER_SIZES = {
  A3: { label: "A3 (297 x 420 mm)", widthIn: 11.69, heightIn: 16.54, cssSize: "A3" },
  A4: { label: "A4 (210 x 297 mm)", widthIn: 8.27, heightIn: 11.69, cssSize: "A4" },
  LETTER: { label: "Letter (8.5 x 11 in)", widthIn: 8.5, heightIn: 11, cssSize: "Letter" },
  LEGAL: { label: "Legal (8.5 x 14 in)", widthIn: 8.5, heightIn: 14, cssSize: "Legal" },
  A5: { label: "A5 (148 x 210 mm)", widthIn: 5.83, heightIn: 8.27, cssSize: "A5" },
} as const;

type PaperSizeKey = keyof typeof PAPER_SIZES;

export default function PrintPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ReportType>("specs");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [stockHistory, setStockHistory] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<string>("30");
  const [paperSize, setPaperSize] = useState<PaperSizeKey>("A4");
  const [printScale, setPrintScale] = useState<number>(100);
  const contentRef = useRef<HTMLDivElement>(null);
  const activePaper = PAPER_SIZES[paperSize];
  const scaleFactor = printScale / 100;
  const paperWidthPx = activePaper.widthIn * 96;
  const mobilePreviewScale =
    viewportWidth > 0 && viewportWidth < 1024
      ? Math.max(0.5, Math.min(1, (viewportWidth - 32) / paperWidthPx))
      : 1;

  const reportNames: Record<ReportType, string> = {
    changelog: "Change-Log",
    specs: "Cocktail-Specs",
    prepspec: "Prep-Spec",
    inventory: "Inventory-Snapshot",
    combined: "Complete-Report",
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [dashRes, historyRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch(`/api/stock-history?limit=500&days=${dateRange}`),
        ]);

        if (dashRes.ok) {
          const dash = await dashRes.json();
          setDashboardData(dash);
        }

        if (historyRes.ok) {
          const hist = await historyRes.json();
          setStockHistory(hist);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dateRange]);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    try {
      setIsExporting(true);
      document.title = `${reportNames[selectedReport]}-${new Date().toISOString().split("T")[0]}`;
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const renderReport = () => {
    if (!dashboardData) return null;

    switch (selectedReport) {
      case "changelog":
        return <ChangeLogReport data={stockHistory} dateRange={{from: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toLocaleDateString(), to: new Date().toLocaleDateString()}} />;
      case "specs":
        return <SpecSheetReport data={dashboardData} />;
      case "prepspec":
        return <PrepSpecReport data={dashboardData} />;
      case "inventory":
        return <InventorySnapshotReport data={dashboardData} />;
      case "combined":
        return (
          <div>
            <SpecSheetReport data={dashboardData} />
            <div className="page-break" style={{ pageBreakBefore: "always" }} />
            <PrepSpecReport data={dashboardData} />
            <div className="page-break" style={{ pageBreakBefore: "always" }} />
            <InventorySnapshotReport data={dashboardData} />
            <div className="page-break" style={{ pageBreakBefore: "always" }} />
            <ChangeLogReport data={stockHistory} />
          </div>
        );
      default:
        return null;
    }
  };

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300" suppressHydrationWarning>
        Loading print page...
      </div>
    );
  }

  return (
    <div id="print-root" className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 lg:flex-row">
      {/* Sidebar */}
      <div id="print-sidebar" className="w-full overflow-y-auto border-b border-white/10 bg-slate-900/85 shadow-2xl backdrop-blur-xl lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-white/10 p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Print & Export</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowControls((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-slate-700 lg:hidden"
              >
                {showControls ? "Hide" : "Options"}
              </button>
              <a
                href="/"
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-slate-700"
              >
                Home
              </a>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Generate printer-friendly reports and save as PDF</p>
        </div>

        <div className={`${showControls ? "block" : "hidden"} space-y-4 p-4 lg:block lg:p-6`}>
          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-300">Report Type</label>
            <div className="space-y-2">
              {[
                { value: "specs" as ReportType, label: "Cocktail Specs" },
                { value: "prepspec" as ReportType, label: "Prep Specs" },
                { value: "inventory" as ReportType, label: "Inventory Snapshot" },
                { value: "changelog" as ReportType, label: "Change Log" },
                { value: "combined" as ReportType, label: "Complete Report" },
              ].map((report) => (
                <button
                  key={report.value}
                  onClick={() => setSelectedReport(report.value)}
                  className={`w-full p-3 rounded text-left transition ${
                    selectedReport === report.value
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold ring-1 ring-sky-400/50"
                      : "bg-slate-800/90 hover:bg-slate-700 text-slate-200 ring-1 ring-slate-700"
                  }`}
                >
                  {report.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReport === "changelog" && (
            <div>
              <label className="block text-sm font-semibold mb-2">
                Time Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-slate-100"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSizeKey)}
                className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100"
              >
                {Object.entries(PAPER_SIZES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">Scale</label>
              <select
                value={String(printScale)}
                onChange={(e) => setPrintScale(Number(e.target.value))}
                className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100"
              >
                {[80, 90, 100, 110, 120].map((value) => (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <button
              onClick={handleDownloadPDF}
              disabled={loading || isExporting}
              className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-600"
            >
              {isExporting ? "Preparing..." : loading ? "Loading..." : "⬇️ Print / Save PDF"}
            </button>
          </div>

          <div className="border-t border-white/10 pt-4 text-xs text-slate-400">
            <p className="mb-2 font-semibold text-slate-300">Keyboard Shortcuts:</p>
            <ul className="space-y-1">
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Ctrl+P</code> to print
              </li>
              <li>
                <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Ctrl+S</code> to save
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div id="print-main" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div id="print-toolbar" className="flex items-center justify-between border-b border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white">Preview</h2>
          {loading && <span className="text-sm text-slate-400">Loading...</span>}
        </div>

        {/* Content Preview */}
        <div id="print-scroll" className="flex-1 overflow-auto bg-slate-800/40 p-3 lg:p-6">
          <div
            ref={contentRef}
            id="print-canvas"
            className="mx-auto min-h-full bg-white shadow-2xl ring-1 ring-black/30"
            style={{
              width: `${activePaper.widthIn}in`,
              minHeight: `${activePaper.heightIn}in`,
            }}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <span className="text-slate-500">Loading data...</span>
              </div>
            ) : (
              <div
                id="preview-fit"
                style={{
                  transform: `scale(${mobilePreviewScale})`,
                  transformOrigin: "top left",
                  width: `${100 / mobilePreviewScale}%`,
                }}
              >
                <div
                  id="print-content"
                  style={{
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: "top left",
                    width: `${100 / scaleFactor}%`,
                  }}
                >
                  {renderReport()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: ${activePaper.cssSize} portrait; margin: 12mm; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }

          #print-sidebar,
          #print-toolbar {
            display: none !important;
          }

          #print-root,
          #print-main,
          #print-scroll {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          #print-canvas {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            outline: 0 !important;
            break-inside: auto;
          }

          #preview-fit {
            transform: none !important;
            width: 100% !important;
          }

          #print-content {
            transform: scale(${scaleFactor}) !important;
            transform-origin: top left !important;
            width: ${100 / scaleFactor}% !important;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

    </div>
  );
}
