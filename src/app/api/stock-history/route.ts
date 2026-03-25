import { NextResponse } from "next/server";
import { getStockAdjustmentHistory } from "@/lib/stock-history";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cocktailId = searchParams.get("cocktailId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const daysParam = parseInt(searchParams.get("days") || "0");
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : undefined;

    const history = await getStockAdjustmentHistory(cocktailId, limit, days);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Stock history GET error:", error);
    return NextResponse.json(
      { error: "Failed to load stock adjustment history" },
      { status: 500 }
    );
  }
}
