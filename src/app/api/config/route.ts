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
        UPDATE cocktails
        SET name = ${data.name as string},
            category = ${data.category as string},
            glassware = ${data.glassware as string | null},
            technique = ${data.technique as string | null},
            straining = ${data.straining as string | null},
            garnish = ${data.garnish as string | null},
            is_batched = ${Boolean(data.isBatched)},
            serve_extras = ${data.serveExtras as string | null},
            updated_at = now()
        WHERE id = ${id}
      `;

      await sql`
        INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at)
        VALUES (${id}, ${data.premixNote as string | null}, ${data.batchNote as string | null}, now(), now())
        ON CONFLICT (cocktail_id) DO UPDATE
        SET premix_note = EXCLUDED.premix_note,
            batch_note = EXCLUDED.batch_note,
            updated_at = now()
      `;
    } else {
      await sql`
        UPDATE premixes
        SET name = ${data.name as string},
            current_bottles = ${Number(data.currentBottles ?? 0)},
            threshold_bottles = ${Number(data.thresholdBottles ?? 0)},
            target_bottles = ${Number(data.targetBottles ?? 0)},
            preparation_notes = ${data.preparationNotes as string | null},
            updated_at = now()
        WHERE premix_id = ${id}
      `;

      // Replace recipe items for the premix: delete existing then insert provided items
      const items = (data.recipeItems ?? []) as Array<{
        ingredient_name?: string;
        ingredient?: string;
        name?: string;
        amount_per_batch?: number;
        amount?: number;
        unit?: string;
        u?: string;
      }>;
      await sql`
        DELETE FROM premix_recipe_items WHERE premix_id = ${id}
      `;
      for (const it of items) {
        const ingredient = String(it.ingredient_name ?? it.ingredient ?? it.name ?? "");
        const amount = Number(it.amount_per_batch ?? it.amount ?? 0);
        const unit = String(it.unit ?? it.u ?? "parts");
        if (!ingredient) continue;
        await sql`
          INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit, created_at)
          VALUES (${id}, ${ingredient}, ${amount}, ${unit}, now())
        `;
      }
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
