import { NextResponse } from "next/server";
import { getStockAdjustmentHistory } from "@/lib/stock-history";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cocktailId = searchParams.get("cocktailId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

    const history = await getStockAdjustmentHistory(cocktailId, limit);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Stock history GET error:", error);
    return NextResponse.json(
      { error: "Failed to load stock adjustment history" },
      { status: 500 }
    );
  }
}
