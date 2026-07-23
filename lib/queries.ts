import { sql } from "./db"
import type { Premix, RecipeItem, Cocktail, CocktailSpec } from "./db"

export async function getPremixes(): Promise<Premix[]> {
  const rows = await sql`
    SELECT premix_id, name,
           current_bottles::float8 AS current_bottles,
           target_bottles::float8 AS target_bottles,
           threshold_bottles::float8 AS threshold_bottles,
           preparation_notes
    FROM premixes
    ORDER BY name
  `
  return rows as Premix[]
}

export async function getRecipeItems(): Promise<RecipeItem[]> {
  const rows = await sql`
    SELECT id, premix_id, ingredient_name,
           amount_per_batch::float8 AS amount_per_batch, unit
    FROM premix_recipe_items
    ORDER BY ingredient_name
  `
  return rows as RecipeItem[]
}

export async function getCocktails(): Promise<Cocktail[]> {
  const rows = await sql`
    SELECT id, name, category, technique, glassware, straining,
           garnish, serve_extras, is_batched
    FROM cocktails
    ORDER BY name
  `
  return rows as Cocktail[]
}

export async function getCocktailSpecs(): Promise<CocktailSpec[]> {
  const rows = await sql`
    SELECT id, cocktail_id, ingredient, ml::float8 AS ml
    FROM cocktail_specs
    ORDER BY id
  `
  return rows as CocktailSpec[]
}

export type ArchivedPremix = {
  premix_id: string
  name: string
  preparation_notes: string | null
  archived_at: string
}

export type ArchivedRecipeItem = {
  id: number
  premix_id: string
  ingredient_name: string
  amount_per_batch: number
  unit: string
  archived_at: string
}

export async function getArchivedPremixes(): Promise<ArchivedPremix[]> {
  const rows = await sql`
    SELECT premix_id, name, preparation_notes, archived_at::text AS archived_at
    FROM archived_premixes
    ORDER BY archived_at DESC, name
  `
  return rows as ArchivedPremix[]
}

export async function getArchivedRecipeItems(): Promise<ArchivedRecipeItem[]> {
  const rows = await sql`
    SELECT id, premix_id, ingredient_name,
           amount_per_batch::float8 AS amount_per_batch, unit,
           archived_at::text AS archived_at
    FROM archived_premix_recipe_items
    ORDER BY ingredient_name
  `
  return rows as ArchivedRecipeItem[]
}
