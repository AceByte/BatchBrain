import { NextResponse } from "next/server";
import { sql } from "@/lib/legacy-db";

type NewCocktailSpec = {
  ingredient: string;
  ml: number;
};

type NewPremixRecipeItem = {
  ingredientName: string;
  amountPerBatch: number;
  unit: string;
};

type NewCocktailPayload = {
  name: string;
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
  glassware: string | null;
  technique: string | null;
  straining: string | null;
  garnish: string | null;
  isBatched: boolean;
  serveExtras: string | null;
  premixNote: string | null;
  batchNote: string | null;
  specs: NewCocktailSpec[];
  createPremix: boolean;
  premix: {
    currentBottles: number;
    thresholdBottles: number;
    targetBottles: number;
    recipeItems: NewPremixRecipeItem[];
  } | null;
};

function buildBaseId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

async function getUniqueCocktailId(base: string) {
  let candidate = base || "cocktail";
  let counter = 1;

  while (true) {
    const existing = (await sql`
      SELECT id FROM cocktails WHERE id = ${candidate}
      UNION
      SELECT id FROM archived_cocktails WHERE id = ${candidate}
      LIMIT 1
    `) as Array<{ id: string }>;

    if (existing.length === 0) return candidate;

    counter += 1;
    candidate = `${base || "cocktail"}_${counter}`;
  }
}

export async function POST(request: Request) {
  let startedTransaction = false;

  try {
    const body = (await request.json()) as Partial<NewCocktailPayload>;

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const specs = (body.specs ?? [])
      .map((row) => ({
        ingredient: String(row.ingredient ?? "").trim(),
        ml: Number(row.ml ?? 0),
      }))
      .filter((row) => row.ingredient.length > 0);

    if (specs.length === 0) {
      return NextResponse.json(
        { error: "At least one cocktail spec row is required" },
        { status: 400 },
      );
    }

    const category = (body.category ?? "REGULAR").toUpperCase();
    const allowedCategories = new Set(["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"]);
    if (!allowedCategories.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const name = body.name.trim();
    const baseId = buildBaseId(name);
    const cocktailId = await getUniqueCocktailId(baseId);

    const existingName = (await sql`
      SELECT id FROM cocktails WHERE LOWER(name) = LOWER(${name}) LIMIT 1
    `) as Array<{ id: string }>;

    if (existingName.length > 0) {
      return NextResponse.json(
        { error: "A cocktail with that name already exists" },
        { status: 409 },
      );
    }

    await sql`BEGIN`;
    startedTransaction = true;

    await sql`
      INSERT INTO cocktails (id, name, category, glassware, technique, straining, garnish, is_batched, serve_extras)
      VALUES (
        ${cocktailId},
        ${name},
        ${category},
        ${body.glassware ?? null},
        ${body.technique ?? null},
        ${body.straining ?? null},
        ${body.garnish ?? null},
        ${Boolean(body.isBatched)},
        ${body.serveExtras ?? null}
      )
    `;

    for (const row of specs) {
      await sql`
        INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
        VALUES (${cocktailId}, ${row.ingredient}, ${row.ml})
      `;
    }

    if ((body.premixNote && body.premixNote.trim().length > 0) || (body.batchNote && body.batchNote.trim().length > 0)) {
      await sql`
        INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note)
        VALUES (${cocktailId}, ${body.premixNote ?? null}, ${body.batchNote ?? null})
      `;
    }

    if (body.createPremix) {
      const premix = body.premix;
      if (!premix) {
        throw new Error("Premix details are required when createPremix is enabled");
      }

      const recipeItems = (premix.recipeItems ?? [])
        .map((item) => ({
          ingredientName: String(item.ingredientName ?? "").trim(),
          amountPerBatch: Number(item.amountPerBatch ?? 0),
          unit: String(item.unit ?? "parts").trim() || "parts",
        }))
        .filter((item) => item.ingredientName.length > 0);

      if (recipeItems.length === 0) {
        throw new Error("Premix recipe requires at least one ingredient");
      }

      const existingPremix = (await sql`
        SELECT premix_id FROM premixes WHERE premix_id = ${cocktailId} OR LOWER(name) = LOWER(${name}) LIMIT 1
      `) as Array<{ premix_id: string }>;

      if (existingPremix.length > 0) {
        throw new Error("A premix with this id or name already exists");
      }

      await sql`
        INSERT INTO premixes (premix_id, name, current_bottles, threshold_bottles, target_bottles)
        VALUES (
          ${cocktailId},
          ${name},
          ${Number(premix.currentBottles ?? 0)},
          ${Number(premix.thresholdBottles ?? 2)},
          ${Number(premix.targetBottles ?? 6)}
        )
      `;

      for (const item of recipeItems) {
        await sql`
          INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
          VALUES (
            ${cocktailId},
            ${item.ingredientName},
            ${item.amountPerBatch},
            ${item.unit}
          )
        `;
      }

      await sql`
        INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note)
        VALUES (${cocktailId}, ${body.premixNote ?? null}, ${body.batchNote ?? null})
        ON CONFLICT (cocktail_id)
        DO UPDATE SET premix_note = EXCLUDED.premix_note, batch_note = EXCLUDED.batch_note
      `;
    }

    await sql`COMMIT`;
    return NextResponse.json({ success: true, id: cocktailId });
  } catch (error) {
    if (startedTransaction) {
      await sql`ROLLBACK`;
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create cocktail" },
      { status: 500 },
    );
  }
}
