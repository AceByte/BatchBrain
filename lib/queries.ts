import { sql } from "./db"
import { getDepletionMetrics } from "./business-rules"
import type { Premix, RecipeItem, Cocktail, CocktailSpec, CocktailCategory } from "./db"

export async function getPremixes(): Promise<Premix[]> {
  const rows = await sql`
    SELECT premix_id, name,
           current_bottles::float8 AS current_bottles,
           target_bottles::float8 AS target_bottles,
           threshold_bottles::float8 AS threshold_bottles,
           bottles_per_batch::float8 AS bottles_per_batch,
           preparation_notes,
           prep_deadline::text AS prep_deadline
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

export type IngredientAlias = { alias: string; canonical_name: string }

export async function getIngredientAliases(): Promise<IngredientAlias[]> {
  const rows = await sql`
    SELECT alias, canonical_name
    FROM ingredient_aliases
    ORDER BY canonical_name, alias
  `
  return rows as IngredientAlias[]
}

export type StockHistoryEvent = {
  event_id: string
  premix_id: string
  premix_name: string
  event_type: "PRODUCTION" | "ADJUSTMENT"
  event_date: string
  happened_at: string
  quantity: number | null
  old_value: number | null
  new_value: number | null
  delta: number | null
  reason: string | null
  notes: string | null
  reversal_of_id: number | null
  reversed_by_id: number | null
}

export async function getStockHistory(): Promise<StockHistoryEvent[]> {
  const rows = await sql`
    SELECT event_id, premix_id, premix_name, event_type, event_date, happened_at,
           quantity, old_value, new_value, delta, reason, notes, reversal_of_id, reversed_by_id
    FROM (
      SELECT ('production-' || l.id::text) AS event_id,
             l.premix_id,
             coalesce(p.name, l.premix_id) AS premix_name,
             'PRODUCTION' AS event_type,
             l.production_date::text AS event_date,
             l.logged_at::text AS happened_at,
             l.produced_bottles::float8 AS quantity,
             NULL::float8 AS old_value,
             NULL::float8 AS new_value,
             l.produced_bottles::float8 AS delta,
             NULL::text AS reason,
             l.notes,
             NULL::bigint AS reversal_of_id,
             NULL::bigint AS reversed_by_id
      FROM production_logs l
      LEFT JOIN premixes p ON p.premix_id = l.premix_id
      UNION ALL
      SELECT ('adjustment-' || l.id::text) AS event_id,
             l.premix_id,
             l.premix_name,
             'ADJUSTMENT' AS event_type,
             l.created_at::date::text AS event_date,
             l.created_at::text AS happened_at,
             NULL::float8 AS quantity,
             l.old_value::float8 AS old_value,
             l.new_value::float8 AS new_value,
             l.delta::float8 AS delta,
             l.reason,
             l.notes,
             l.reversal_of_id,
             reversal.id AS reversed_by_id
      FROM stock_adjustment_logs l
      LEFT JOIN stock_adjustment_logs reversal ON reversal.reversal_of_id = l.id
    ) history
    ORDER BY happened_at DESC
    LIMIT 100
  `
  return rows as StockHistoryEvent[]
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

export type CocktailPremixSpec = {
  id: number
  cocktail_id: string
  premix_note: string | null
  batch_note: string | null
}

export async function getCocktailPremixSpecs(): Promise<CocktailPremixSpec[]> {
  const rows = await sql`
    SELECT id, cocktail_id, premix_note, batch_note
    FROM cocktail_premix_specs
    ORDER BY id
  `
  return rows as CocktailPremixSpec[]
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

export type ArchivedCocktail = {
  id: string
  name: string
  category: CocktailCategory
  technique: string | null
  glassware: string | null
  straining: string | null
  garnish: string | null
  serve_extras: string | null
  is_batched: boolean
  archived_at: string
}

export type ArchivedCocktailSpec = {
  id: number
  cocktail_id: string
  ingredient: string
  ml: number
  archived_at: string
}

export type ArchivedCocktailPremixSpec = {
  id: number
  cocktail_id: string
  premix_note: string | null
  batch_note: string | null
  archived_at: string
}

export async function getArchivedCocktails(): Promise<ArchivedCocktail[]> {
  const rows = await sql`
    SELECT id, name, category, technique, glassware, straining, garnish,
           serve_extras, is_batched, archived_at::text AS archived_at
    FROM archived_cocktails
    ORDER BY archived_at DESC, name
  `
  return rows as ArchivedCocktail[]
}

export async function getArchivedCocktailSpecs(): Promise<ArchivedCocktailSpec[]> {
  const rows = await sql`
    SELECT id, cocktail_id, ingredient, ml::float8 AS ml, archived_at::text AS archived_at
    FROM archived_cocktail_specs
    ORDER BY id
  `
  return rows as ArchivedCocktailSpec[]
}

export async function getArchivedCocktailPremixSpecs(): Promise<ArchivedCocktailPremixSpec[]> {
  const rows = await sql`
    SELECT id, cocktail_id, premix_note, batch_note, archived_at::text AS archived_at
    FROM archived_cocktail_premix_specs
    ORDER BY id
  `
  return rows as ArchivedCocktailPremixSpec[]
}

export async function getAnalytics() {
  const [overview, recent, stockHealth, depletion, ingredientDemand, categoryBreakdown] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM premixes) AS premix_count,
        (SELECT count(*)::int FROM premixes WHERE current_bottles <= threshold_bottles) AS low_count,
        (SELECT count(*)::int FROM cocktails) AS cocktail_count,
        (SELECT coalesce(sum(produced_bottles), 0)::float8 FROM production_logs WHERE production_date >= current_date - interval '30 days') AS produced_last_30_days
    `,
    sql`
      SELECT premix_name AS name, delta::float8 AS delta, reason, created_at::text AS happened_at
      FROM stock_adjustment_logs
      ORDER BY created_at DESC
      LIMIT 8
    `,
    sql`
      SELECT premix_id, name,
             current_bottles::float8 AS current_bottles,
             target_bottles::float8 AS target_bottles,
             threshold_bottles::float8 AS threshold_bottles
      FROM premixes
      ORDER BY (current_bottles::float8 / NULLIF(target_bottles, 0)) ASC NULLS FIRST
    `,
    sql`
      SELECT premix_id, sum(delta)::float8 AS net_delta
      FROM stock_adjustment_logs
      WHERE created_at >= current_date - interval '30 days' AND delta < 0
      GROUP BY premix_id
    `,
    sql`
      SELECT coalesce(a.canonical_name, trim(r.ingredient_name)) AS ingredient_name, lower(trim(r.unit)) AS unit,
             sum(r.amount_per_batch)::float8 AS total_amount,
             count(DISTINCT r.premix_id)::int AS premix_count
      FROM premix_recipe_items r
      LEFT JOIN ingredient_aliases a ON lower(trim(r.ingredient_name)) = a.alias
      GROUP BY coalesce(a.canonical_name, trim(r.ingredient_name)), lower(trim(r.unit))
      ORDER BY total_amount DESC
      LIMIT 12
    `,
    sql`
      SELECT category,
             count(*)::int AS total,
             count(*) FILTER (WHERE is_batched)::int AS batched_count
      FROM cocktails
      GROUP BY category
    `,
  ])

  const depletionByPremix = new Map<string, number>()
  for (const row of depletion as { premix_id: string; net_delta: number }[]) {
    depletionByPremix.set(row.premix_id, row.net_delta)
  }

  const stock = (stockHealth as { premix_id: string; name: string; current_bottles: number; target_bottles: number; threshold_bottles: number }[]).map((p) => {
    const netDelta = depletionByPremix.get(p.premix_id) ?? 0
    return { ...p, ...getDepletionMetrics(p.current_bottles, netDelta) }
  })

  return {
    overview: overview[0] as { premix_count: number; low_count: number; cocktail_count: number; produced_last_30_days: number },
    recent: recent as { name: string; delta: number; reason: string; happened_at: string }[],
    stockHealth: stock,
    ingredientDemand: ingredientDemand as { ingredient_name: string; unit: string; total_amount: number; premix_count: number }[],
    categoryBreakdown: categoryBreakdown as { category: string; total: number; batched_count: number }[],
  }
}
