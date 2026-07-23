import { neon } from "@neondatabase/serverless"

export const sql = neon(process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder")

export type Premix = {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  preparation_notes: string | null
}

export type RecipeItem = {
  id: number
  premix_id: string
  ingredient_name: string
  amount_per_batch: number
  unit: string
}

export type CocktailCategory = "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS"

export type Cocktail = {
  id: string
  name: string
  category: CocktailCategory
  technique: string | null
  glassware: string | null
  straining: string | null
  garnish: string | null
  serve_extras: string | null
  is_batched: boolean
}

export type CocktailSpec = {
  id: number
  cocktail_id: string
  ingredient: string
  ml: number
}
