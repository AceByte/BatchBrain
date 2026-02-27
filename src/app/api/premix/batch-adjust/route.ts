import { NextResponse } from "next/server";
import { sql } from "@/lib/legacy-db";

type Change = {
  id: number;
  newValue: number;
  deltaBottles: number;
};

type Body = {
  changes: Change[];
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const { changes } = body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 },
      );
    }

    // Validate all changes
    for (const change of changes) {
      if (!Number.isInteger(change.id) || change.id < 1) {
        return NextResponse.json(
          { error: `Invalid premix id: ${change.id}` },
          { status: 400 },
        );
      }
      if (!Number.isFinite(change.newValue) || change.newValue < 0) {
        return NextResponse.json(
          { error: `Invalid new value for premix ${change.id}` },
          { status: 400 },
        );
      }
    }

    // Get all inventory items in order (matching dashboard order)
    const allItems = (await sql`
      SELECT "cocktailId", name, count, threshold FROM inventory ORDER BY name ASC
    `) as Array<{
      cocktailId: string;
      name: string;
      count: number;
      threshold: number;
    }>;

    // Create a map of id (1-based) to cocktailId
    const idToCocktailId = new Map(
      allItems.map((item, index) => [index + 1, item.cocktailId]),
    );

    // Apply all changes
    const results = [];
    for (const change of changes) {
      const cocktailId = idToCocktailId.get(change.id);
      if (!cocktailId) {
        return NextResponse.json(
          { error: `Premix not found with id: ${change.id}` },
          { status: 404 },
        );
      }

      await sql`
        UPDATE inventory 
        SET count = ${Math.round(change.newValue * 100) / 100}
        WHERE "cocktailId" = ${cocktailId}
      `;

      results.push({
        id: change.id,
        cocktailId,
        newValue: change.newValue,
        applied: true,
      });
    }

    return NextResponse.json({
      applied: true,
      changesCount: results.length,
      changes: results,
    });
  } catch (error) {
    console.error("Batch adjust error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply batch changes",
      },
      { status: 500 },
    );
  }
}

