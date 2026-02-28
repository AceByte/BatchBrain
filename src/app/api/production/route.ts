import { NextResponse } from "next/server";
import { logProduction, getProductionHistory } from "@/lib/production";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cocktailId = searchParams.get("cocktailId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

    const history = await getProductionHistory(cocktailId, limit);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Production history GET error:", error);
    return NextResponse.json(
      { error: "Failed to load production history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cocktailId, amount, date, notes } = body;

    if (!cocktailId || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid cocktailId or amount" },
        { status: 400 }
      );
    }

    await logProduction({ cocktailId, amount, date, notes });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Production logging error:", error);
    return NextResponse.json(
      { error: "Failed to log production" },
      { status: 500 }
    );
  }
}
