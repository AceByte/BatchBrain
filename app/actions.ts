"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

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
  revalidatePath("/")
  revalidatePath("/specs")
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
  revalidatePath("/")
  revalidatePath("/specs")
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

  revalidatePath("/")
  revalidatePath("/specs")
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

  revalidatePath("/specs")
  revalidatePath("/")
}
