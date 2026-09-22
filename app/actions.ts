"use server"

import { sql } from "@/lib/db"
import { roundBottles, slugify, validatePremixStock, validateProductionDate } from "@/lib/business-rules"
import { revalidatePath } from "next/cache"

function requireFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a valid number.`)
}

function friendlyUniqueError(error: unknown, entity: "premix" | "cocktail"): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    throw new Error(`A ${entity} with this name already exists.`)
  }
  throw error
}

function refreshPages() {
  revalidatePath("/")
  revalidatePath("/specs")
  revalidatePath("/archive")
  revalidatePath("/analytics")
}

export async function createIngredientAlias(formData: FormData) {
  const alias = String(formData.get("alias") || "").trim().toLowerCase()
  const canonicalName = String(formData.get("canonical_name") || "").trim()
  if (!alias || !canonicalName) throw new Error("Enter both an ingredient alias and canonical name.")
  if (alias === canonicalName.toLowerCase()) throw new Error("Alias and canonical name must be different.")
  try {
    await sql`INSERT INTO ingredient_aliases (alias, canonical_name) VALUES (${alias}, ${canonicalName})`
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new Error("That ingredient alias already exists.")
    }
    throw error
  }
  refreshPages()
}

export async function deleteIngredientAlias(formData: FormData) {
  const alias = String(formData.get("alias") || "").trim().toLowerCase()
  if (!alias) throw new Error("Ingredient alias is invalid.")
  await sql`DELETE FROM ingredient_aliases WHERE alias = ${alias}`
  refreshPages()
}

// Manually set a premix's stock. Records the change in stock_adjustment_logs.
export async function adjustStock(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const newValue = Number(formData.get("new_value"))
  const reason = String(formData.get("reason") || "manual")
  const notes = String(formData.get("notes") || "")

  requireFiniteNumber(newValue, "Stock value")
  const current = await sql`
    SELECT name, current_bottles::float8 AS current_bottles
    FROM premixes WHERE premix_id = ${premixId}
  `
  if (current.length === 0) throw new Error("Premix not found. Refresh the page and try again.")
  const oldValue = current[0].current_bottles as number
  const name = current[0].name as string

  const roundedValue = roundBottles(newValue)
  await sql.transaction([
    sql`UPDATE premixes SET current_bottles = ${roundedValue}, updated_at = now() WHERE premix_id = ${premixId}`,
    sql`INSERT INTO stock_adjustment_logs (premix_id, premix_name, old_value, new_value, delta, reason, notes, created_at)
        VALUES (${premixId}, ${name}, ${oldValue}, ${roundedValue}, ${roundBottles(roundedValue - oldValue)}, ${reason}, ${notes}, now())`,
  ])
  refreshPages()
}

// Reverse one manual adjustment by appending an equal-and-opposite adjustment.
// The original log row is never edited or deleted.
export async function reverseStockAdjustment(formData: FormData) {
  const adjustmentId = Number(formData.get("adjustment_id"))
  if (!Number.isInteger(adjustmentId) || adjustmentId <= 0) throw new Error("Adjustment record is invalid.")

  const rows = await sql`
    SELECT l.id, l.premix_id, l.premix_name, l.delta::float8 AS delta,
           l.reversal_of_id, p.current_bottles::float8 AS current_bottles
    FROM stock_adjustment_logs l
    JOIN premixes p ON p.premix_id = l.premix_id
    WHERE l.id = ${adjustmentId}
  `
  if (rows.length === 0) throw new Error("Adjustment record not found. Refresh the page and try again.")
  const original = rows[0] as { id: number; premix_id: string; premix_name: string; delta: number; reversal_of_id: number | null; current_bottles: number }
  if (original.reversal_of_id !== null) throw new Error("A reversal cannot itself be reversed.")

  const existingReversal = await sql`SELECT id FROM stock_adjustment_logs WHERE reversal_of_id = ${adjustmentId}`
  if (existingReversal.length > 0) throw new Error("This adjustment has already been reversed.")

  const newValue = roundBottles(original.current_bottles - original.delta)
  const reverseDelta = roundBottles(newValue - original.current_bottles)
  await sql.transaction([
    sql`UPDATE premixes SET current_bottles = ${newValue}, updated_at = now() WHERE premix_id = ${original.premix_id}`,
    sql`INSERT INTO stock_adjustment_logs (premix_id, premix_name, old_value, new_value, delta, reason, notes, reversal_of_id, created_at)
        VALUES (${original.premix_id}, ${original.premix_name}, ${original.current_bottles}, ${newValue}, ${reverseDelta}, 'undo', ${`Reversal of adjustment #${original.id}`}, ${adjustmentId}, now())`,
  ])
  refreshPages()
}

// Log a production batch: adds produced bottles to stock and records the log.
export async function logProduction(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const produced = Number(formData.get("produced_bottles"))
  const notes = String(formData.get("notes") || "")
  const productionDateInput = String(formData.get("production_date") || "")
  requireFiniteNumber(produced, "Produced bottles")
  if (produced <= 0) throw new Error("Produced bottles must be greater than zero.")
  const productionDate = productionDateInput ? validateProductionDate(productionDateInput) : new Date().toISOString().slice(0, 10)

  const existing = await sql`SELECT premix_id FROM premixes WHERE premix_id = ${premixId}`
  if (existing.length === 0) throw new Error("Premix not found. Refresh the page and try again.")
  const roundedProduced = roundBottles(produced)
  await sql.transaction([
    sql`UPDATE premixes SET current_bottles = round((current_bottles + ${roundedProduced})::numeric, 2), updated_at = now() WHERE premix_id = ${premixId}`,
    sql`INSERT INTO production_logs (premix_id, produced_bottles, production_date, notes, logged_at)
        VALUES (${premixId}, ${roundedProduced}, ${productionDate}, ${notes}, now())`,
  ])
  refreshPages()
}

// Update Premix stock levels, targets, thresholds, notes, and recipe items
export async function updatePremix(data: {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  bottles_per_batch: number
  preparation_notes: string | null
  prep_deadline: string | null
  ingredients: { ingredient_name: string; amount_per_batch: number; unit: string }[]
}) {
  const { premix_id, name, current_bottles, target_bottles, threshold_bottles, bottles_per_batch, preparation_notes, prep_deadline, ingredients } = data
  requireFiniteNumber(current_bottles, "Current stock")
  requireFiniteNumber(target_bottles, "Target stock")
  requireFiniteNumber(threshold_bottles, "Minimum threshold")
  requireFiniteNumber(bottles_per_batch, "Bottles per batch")
  if (bottles_per_batch <= 0) throw new Error("Bottles per batch must be greater than zero.")
  validatePremixStock(target_bottles, threshold_bottles)
  const validatedDeadline = prep_deadline ? validateProductionDate(prep_deadline) : null

  const existing = await sql`SELECT premix_id FROM premixes WHERE premix_id = ${premix_id}`
  if (existing.length === 0) throw new Error("Premix not found. Refresh the page and try again.")

  await sql.transaction((tx) => [
    tx`UPDATE premixes SET name = ${name}, current_bottles = ${roundBottles(current_bottles)}, target_bottles = ${roundBottles(target_bottles)}, threshold_bottles = ${roundBottles(threshold_bottles)}, bottles_per_batch = ${roundBottles(bottles_per_batch)}, preparation_notes = ${preparation_notes || null}, prep_deadline = ${validatedDeadline}, updated_at = now() WHERE premix_id = ${premix_id}`,
    tx`DELETE FROM premix_recipe_items WHERE premix_id = ${premix_id}`,
    ...ingredients.filter((item) => item.ingredient_name.trim()).map((item) => tx`INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit) VALUES (${premix_id}, ${item.ingredient_name.trim()}, ${item.amount_per_batch || 0}, ${item.unit || "ml"})`),
  ])

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

  const existing = await sql`SELECT id FROM cocktails WHERE id = ${id}`
  if (existing.length === 0) throw new Error("Cocktail not found. Refresh the page and try again.")

  await sql.transaction((tx) => [
    tx`UPDATE cocktails SET name = ${name}, category = ${category}, technique = ${technique || null}, glassware = ${glassware || null}, straining = ${straining || null}, garnish = ${garnish || null}, serve_extras = ${serve_extras || null}, is_batched = ${is_batched} WHERE id = ${id}`,
    tx`DELETE FROM cocktail_specs WHERE cocktail_id = ${id}`,
    ...ingredients.filter((item) => item.ingredient.trim()).map((item) => tx`INSERT INTO cocktail_specs (cocktail_id, ingredient, ml) VALUES (${id}, ${item.ingredient.trim()}, ${item.ml || 0})`),
  ])

  refreshPages()
}

export async function createPremix(data: Omit<Parameters<typeof updatePremix>[0], "premix_id">) {
  const premix_id = slugify(data.name)
  if (!premix_id) throw new Error("Enter a premix name containing letters or numbers.")
  validatePremixStock(data.target_bottles, data.threshold_bottles)
  const validatedDeadline = data.prep_deadline ? validateProductionDate(data.prep_deadline) : null
  const existing = await sql`SELECT premix_id FROM premixes WHERE premix_id = ${premix_id}`
  if (existing.length > 0) throw new Error("A premix with this name already exists.")
  try {
    await sql.transaction((tx) => [
      tx`INSERT INTO premixes (premix_id, name, current_bottles, target_bottles, threshold_bottles, bottles_per_batch, preparation_notes, prep_deadline, updated_at) VALUES (${premix_id}, ${data.name}, ${roundBottles(data.current_bottles)}, ${roundBottles(data.target_bottles)}, ${roundBottles(data.threshold_bottles)}, ${roundBottles(data.bottles_per_batch)}, ${data.preparation_notes}, ${validatedDeadline}, now())`,
      ...data.ingredients.filter((item) => item.ingredient_name.trim()).map((item) => tx`INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit) VALUES (${premix_id}, ${item.ingredient_name.trim()}, ${item.amount_per_batch || 0}, ${item.unit || "ml"})`),
    ])
  } catch (error) { friendlyUniqueError(error, "premix") }
  refreshPages()
}

export async function createCocktail(data: Omit<Parameters<typeof updateCocktailSpec>[0], "id">) {
  const id = slugify(data.name)
  if (!id) throw new Error("Enter a cocktail name containing letters or numbers.")
  const existing = await sql`SELECT id FROM cocktails WHERE id = ${id}`
  if (existing.length > 0) throw new Error("A cocktail with this name already exists.")
  try {
    await sql.transaction((tx) => [
      tx`INSERT INTO cocktails (id, name, category, technique, glassware, straining, garnish, serve_extras, is_batched, updated_at) VALUES (${id}, ${data.name}, ${data.category}, ${data.technique}, ${data.glassware}, ${data.straining}, ${data.garnish}, ${data.serve_extras}, ${data.is_batched}, now())`,
      ...data.ingredients.filter((item) => item.ingredient.trim()).map((item) => tx`INSERT INTO cocktail_specs (cocktail_id, ingredient, ml) VALUES (${id}, ${item.ingredient.trim()}, ${item.ml || 0})`),
    ])
  } catch (error) { friendlyUniqueError(error, "cocktail") }
  refreshPages()
}

export async function archiveCocktail(formData: FormData) {
  const id = String(formData.get("id"))
  const existing = await sql`SELECT id FROM cocktails WHERE id = ${id}`
  if (existing.length === 0) throw new Error("Cocktail not found. Refresh the page and try again.")
  await sql.transaction([
    sql`INSERT INTO archived_cocktails (id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category) SELECT id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category FROM cocktails WHERE id = ${id}`,
    sql`INSERT INTO archived_cocktail_specs (cocktail_id, ingredient, ml, created_at) SELECT cocktail_id, ingredient, ml, created_at FROM cocktail_specs WHERE cocktail_id = ${id}`,
    sql`INSERT INTO archived_cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at) SELECT cocktail_id, premix_note, batch_note, created_at, updated_at FROM cocktail_premix_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM cocktail_premix_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM cocktail_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM cocktails WHERE id = ${id}`,
  ])
  refreshPages()
}

export async function restoreCocktail(formData: FormData) {
  const id = String(formData.get("id"))
  const existing = await sql`SELECT id FROM archived_cocktails WHERE id = ${id}`
  if (existing.length === 0) throw new Error("Archived cocktail not found. Refresh the page and try again.")
  await sql.transaction([
    sql`INSERT INTO cocktails (id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category) SELECT id, name, glassware, technique, straining, garnish, is_batched, serve_extras, created_at, updated_at, category FROM archived_cocktails WHERE id = ${id}`,
    sql`INSERT INTO cocktail_specs (cocktail_id, ingredient, ml, created_at) SELECT cocktail_id, ingredient, ml, created_at FROM archived_cocktail_specs WHERE cocktail_id = ${id}`,
    sql`INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note, created_at, updated_at) SELECT cocktail_id, premix_note, batch_note, created_at, updated_at FROM archived_cocktail_premix_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM archived_cocktail_premix_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM archived_cocktail_specs WHERE cocktail_id = ${id}`,
    sql`DELETE FROM archived_cocktails WHERE id = ${id}`,
  ])
  refreshPages()
}
