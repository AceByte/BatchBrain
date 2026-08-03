"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

function refreshPages() {
  revalidatePath("/")
  revalidatePath("/specs")
  revalidatePath("/archive")
  revalidatePath("/analytics")
}

// Manually set a premix's stock. Records the change in stock_adjustment_logs.
export async function adjustStock(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const newValue = Number(formData.get("new_value"))
  const reason = String(formData.get("reason") || "manual")

  const current = await sql`
    SELECT name, current_bottles::float8 AS current_bottles
    FROM premixes WHERE premix_id = ${premixId}
  `
  if (current.length === 0) return
  const oldValue = current[0].current_bottles as number
  const name = current[0].name as string

  await sql`
    UPDATE premixes
    SET current_bottles = ${newValue}, updated_at = now()
    WHERE premix_id = ${premixId}
  `
  await sql`
    INSERT INTO stock_adjustment_logs
      (premix_id, premix_name, old_value, new_value, delta, reason, created_at)
    VALUES
      (${premixId}, ${name}, ${oldValue}, ${newValue}, ${newValue - oldValue}, ${reason}, now())
  `
  refreshPages()
}

// Log a production batch: adds produced bottles to stock and records the log.
export async function logProduction(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const produced = Number(formData.get("produced_bottles"))
  const notes = String(formData.get("notes") || "")
  if (!produced) return

  await sql`
    UPDATE premixes
    SET current_bottles = current_bottles + ${produced}, updated_at = now()
    WHERE premix_id = ${premixId}
  `
  await sql`
    INSERT INTO production_logs
      (premix_id, produced_bottles, production_date, notes, logged_at)
    VALUES
      (${premixId}, ${produced}, current_date, ${notes}, now())
  `
  refreshPages()
}

// Update Premix stock levels, targets, thresholds, notes, and recipe items
export async function updatePremix(data: {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  preparation_notes: string | null
  ingredients: { ingredient_name: string; amount_per_batch: number; unit: string }[]
}) {
  const { premix_id, name, current_bottles, target_bottles, threshold_bottles, preparation_notes, ingredients } = data

  await sql`
    UPDATE premixes
    SET name = ${name},
        current_bottles = ${current_bottles},
        target_bottles = ${target_bottles},
        threshold_bottles = ${threshold_bottles},
        preparation_notes = ${preparation_notes || null},
        updated_at = now()
    WHERE premix_id = ${premix_id}
  `

  await sql`DELETE FROM premix_recipe_items WHERE premix_id = ${premix_id}`
  for (const item of ingredients) {
    if (item.ingredient_name.trim()) {
      await sql`
        INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
        VALUES (${premix_id}, ${item.ingredient_name.trim()}, ${item.amount_per_batch || 0}, ${item.unit || "ml"})
      `
    }
  }

  refreshPages()
}

// Update Cocktail metadata (technique, glass, straining, garnish, extras, batched) & specs
export async function updateCocktailSpec(data: {
  id: string
  name: string
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS"
  technique: string | null
  glassware: string | null
  straining: string | null
  garnish: string | null
  serve_extras: string | null
  is_batched: boolean
  ingredients: { ingredient: string; ml: number }[]
}) {
  const { id, name, category, technique, glassware, straining, garnish, serve_extras, is_batched, ingredients } = data

  await sql`
    UPDATE cocktails
    SET name = ${name},
        category = ${category},
        technique = ${technique || null},
        glassware = ${glassware || null},
        straining = ${straining || null},
        garnish = ${garnish || null},
        serve_extras = ${serve_extras || null},
        is_batched = ${is_batched}
    WHERE id = ${id}
  `

  await sql`DELETE FROM cocktail_specs WHERE cocktail_id = ${id}`
  for (const item of ingredients) {
    if (item.ingredient.trim()) {
      await sql`
        INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
        VALUES (${id}, ${item.ingredient.trim()}, ${item.ml || 0})
      `
    }
  }

  refreshPages()
}

export async function createPremix(data: Omit<Parameters<typeof updatePremix>[0], "premix_id">) {
  const premix_id = slugify(data.name)
  await sql`
    INSERT INTO premixes (premix_id, name, current_bottles, target_bottles, threshold_bottles, preparation_notes, updated_at)
    VALUES (${premix_id}, ${data.name}, ${data.current_bottles}, ${data.target_bottles}, ${data.threshold_bottles}, ${data.preparation_notes}, now())
  `
  for (const item of data.ingredients.filter((item) => item.ingredient_name.trim())) {
    await sql`INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit) VALUES (${premix_id}, ${item.ingredient_name.trim()}, ${item.amount_per_batch || 0}, ${item.unit || "ml"})`
  }
  refreshPages()
}

export async function createCocktail(data: Omit<Parameters<typeof updateCocktailSpec>[0], "id">) {
  const id = slugify(data.name)
  await sql`
    INSERT INTO cocktails (id, name, category, technique, glassware, straining, garnish, serve_extras, is_batched, updated_at)
    VALUES (${id}, ${data.name}, ${data.category}, ${data.technique}, ${data.glassware}, ${data.straining}, ${data.garnish}, ${data.serve_extras}, ${data.is_batched}, now())
  `
  for (const item of data.ingredients.filter((item) => item.ingredient.trim())) {
    await sql`INSERT INTO cocktail_specs (cocktail_id, ingredient, ml) VALUES (${id}, ${item.ingredient.trim()}, ${item.ml || 0})`
  }
  refreshPages()
}

export async function archiveCocktail(formData: FormData) {
  const id = String(formData.get("id"))
  await sql`INSERT INTO archived_cocktails (id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category) SELECT id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category FROM cocktails WHERE id = ${id}`
  await sql`INSERT INTO archived_cocktail_specs (cocktail_id, ingredient, ml, created_at) SELECT cocktail_id, ingredient, ml, created_at FROM cocktail_specs WHERE cocktail_id = ${id}`
  await sql`INSERT INTO archived_cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at) SELECT cocktail_id, premix_note, batch_note, created_at, updated_at FROM cocktail_premix_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM cocktail_premix_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM cocktail_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM cocktails WHERE id = ${id}`
  refreshPages()
}

export async function restoreCocktail(formData: FormData) {
  const id = String(formData.get("id"))
  await sql`INSERT INTO cocktails (id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category) SELECT id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category FROM archived_cocktails WHERE id = ${id}`
  await sql`INSERT INTO cocktail_specs (cocktail_id, ingredient, ml, created_at) SELECT cocktail_id, ingredient, ml, created_at FROM archived_cocktail_specs WHERE cocktail_id = ${id}`
  await sql`INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at) SELECT cocktail_id, premix_note, batch_note, created_at, updated_at FROM archived_cocktail_premix_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM archived_cocktail_premix_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM archived_cocktail_specs WHERE cocktail_id = ${id}`
  await sql`DELETE FROM archived_cocktails WHERE id = ${id}`
  refreshPages()
}