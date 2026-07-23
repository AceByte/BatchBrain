"use client"

import { useMemo, useState } from "react"
import type { CocktailCategory } from "@/lib/db"
import { EditSpecModal, type SpecEditData } from "./edit-spec-modal"

type SpecIngredient = { id: number; ingredient: string; ml: number }
type SpecMeta = { label: string; value: string }

export type SpecCard = {
  id: string
  name: string
  category: CocktailCategory
  is_batched: boolean
  meta: SpecMeta[]
  ingredients: SpecIngredient[]
}

const CATEGORY_ORDER: CocktailCategory[] = ["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"]
const CATEGORY_LABEL: Record<CocktailCategory, string> = {
  REGULAR: "Regular",
  SEASONAL: "Seasonal",
  SIGNATURE: "Signature",
  INGREDIENTS: "Ingredients",
}

export function SpecsBrowser({ cards }: { cards: SpecCard[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CocktailCategory | "ALL">("ALL")
  const [editingSpec, setEditingSpec] = useState<SpecEditData | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: cards.length }
    for (const cat of CATEGORY_ORDER) c[cat] = cards.filter((x) => x.category === cat).length
    return c
  }, [cards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (category !== "ALL" && c.category !== category) return false
      if (!q) return true
      if (c.name.toLowerCase().includes(q)) return true
      if (c.ingredients.some((i) => i.ingredient.toLowerCase().includes(q))) return true
      if (c.meta.some((m) => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))) return true
      return false
    })
  }, [cards, query, category])

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((c) => c.category === cat),
    })).filter((g) => g.items.length > 0)
  }, [filtered])

  function openEditModal(c: SpecCard) {
    setEditingSpec({
      id: c.id,
      name: c.name,
      category: c.category,
      is_batched: c.is_batched,
      technique: c.meta.find((m) => m.label === "Technique")?.value || "",
      glassware: c.meta.find((m) => m.label === "Glass")?.value || "",
      straining: c.meta.find((m) => m.label === "Straining")?.value || "",
      garnish: c.meta.find((m) => m.label === "Garnish")?.value || "",
      serve_extras: c.meta.find((m) => m.label === "Extras")?.value || "",
      ingredients: c.ingredients.map((i) => ({ ingredient: i.ingredient, ml: i.ml })),
    })
  }

  return (
    <>
      <div className="controls">
        <input
          type="search"
          className="search"
          placeholder="Search drinks, ingredients, or methods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search spec sheets"
        />
        <div className="filters" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            className={category === "ALL" ? "chip active" : "chip"}
            aria-pressed={category === "ALL"}
            onClick={() => setCategory("ALL")}
          >
            All <span className="chip-count">{counts.ALL}</span>
          </button>
          {CATEGORY_ORDER.map((cat) =>
            counts[cat] > 0 ? (
              <button
                key={cat}
                type="button"
                className={category === cat ? "chip active" : "chip"}
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
              >
                {CATEGORY_LABEL[cat]} <span className="chip-count">{counts[cat]}</span>
              </button>
            ) : null,
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted empty">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        grouped.map((g) => (
          <section key={g.category} className="category">
            <h2 className="category-title">
              {CATEGORY_LABEL[g.category]} <span className="category-count">{g.items.length}</span>
            </h2>
            <div className="grid">
              {g.items.map((c) => (
                <article key={c.id} className="card">
                  <div className="card-head">
                    <div className="card-title-group">
                      <h3>{c.name}</h3>
                      {c.is_batched ? <span className="batched">Batched</span> : null}
                    </div>
                    <button
                      type="button"
                      className="btn-edit-icon"
                      onClick={() => openEditModal(c)}
                      title="Edit Spec"
                      aria-label={`Edit spec for ${c.name}`}
                    >
                      Edit
                    </button>
                  </div>
                  {c.ingredients.length === 0 ? (
                    <p className="muted">No spec recorded.</p>
                  ) : (
                    <ul className="recipe">
                      {c.ingredients.map((i) => (
                        <li key={i.id}>
                          <span className="ing-name">{i.ingredient}</span>
                          <span className="amount">{i.ml} ml</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {c.meta && c.meta.length > 0 ? (
                    <ul className="recipe spec-details">
                      {c.meta.map((m, idx) => (
                        <li key={idx}>
                          <span className="ing-name meta-label">{m.label}</span>
                          <span className="amount meta-val">{m.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {editingSpec && (
        <EditSpecModal spec={editingSpec} onClose={() => setEditingSpec(null)} />
      )}
    </>
  )
}
