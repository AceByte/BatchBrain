import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/config";
import { sql } from "@/lib/legacy-db";

type EditBody = {
  type: "cocktail" | "premix";
  id: string;
  data: Record<string, unknown>;
};

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json({ error: "Failed to load configuration" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const updates = await request.json();
    await updateConfig(updates);
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config PATCH error:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as Partial<EditBody>;
    const { type, id, data } = body;

    if ((type !== "cocktail" && type !== "premix") || !id || !data) {
      return NextResponse.json(
        { error: "Invalid payload. Expected type, id, and data." },
        { status: 400 },
      );
    }

    if (type === "cocktail") {
      await sql`
        UPDATE cocktail_specs
        SET name = ${data.name as string},
            category = ${data.category as string},
            glassware = ${data.glassware as string | null},
            technique = ${data.technique as string | null},
            straining = ${data.straining as string | null},
            garnish = ${data.garnish as string | null},
            is_batched = ${Boolean(data.isBatched)},
            serve_extras = ${data.serveExtras as string | null},
            premix_note = ${data.premixNote as string | null},
            batch_note = ${data.batchNote as string | null},
            specs = ${JSON.stringify(data.specs ?? [])}
        WHERE source_cocktail_id = ${id}
      `;
    } else {
      await sql`
        UPDATE premix_specs
        SET name = ${data.name as string},
            current_bottles = ${Number(data.currentBottles ?? 0)},
            threshold_bottles = ${Number(data.thresholdBottles ?? 0)},
            target_bottles = ${Number(data.targetBottles ?? 0)},
            batch_yield_bottles = ${Number(data.batchYieldBottles ?? 0)},
            recipe_items = ${JSON.stringify(data.recipeItems ?? [])}
        WHERE source_cocktail_id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 },
    );
  }
}
