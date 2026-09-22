import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

const databaseUrl = process.env.DATABASE_URL

function missingDatabaseUrl(): never {
  throw new Error("DATABASE_URL is required. Configure a Neon/Postgres connection before starting BatchBrain.")
}

// Keep module evaluation safe during `next build`; the first database operation
// still fails immediately and with an actionable configuration error.
export const sql = databaseUrl
  ? neon(databaseUrl)
  : Object.assign(missingDatabaseUrl, { transaction: missingDatabaseUrl }) as unknown as NeonQueryFunction<false, false>

export type Premix = {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  bottles_per_batch: number
  preparation_notes: string | null
  prep_deadline: string | null
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
