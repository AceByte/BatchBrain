"use client"

import { useMemo, useState } from "react"
import type { CocktailCategory } from "@/lib/db"
import { EditSpecModal, type SpecEditData } from "./edit-spec-modal"
import { archiveCocktail } from "@/app/actions"

type SpecIngredient = { id: number; ingredient: string; ml: number }
type SpecMeta = { label: string; value: string }
type PremixSpec = {
  id: string
  premixNote: string | null
  batchNote: string | null
  premix: {
    name: string
    current: number
    target: number
    threshold: number
    recipe: { id: number; ingredient_name: string; amount_per_batch: number; unit: string }[]
  } | null
}

export type SpecCard = {
  id: string
  name: string
  category: CocktailCategory
  is_batched: boolean
  meta: SpecMeta[]
  extras: string | null
  premixSpecs: PremixSpec[]
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
  const [addingCocktail, setAddingCocktail] = useState(false)
  const [printId, setPrintId] = useState<string | null>(null)
  const [printMode, setPrintMode] = useState<"single" | "filtered" | null>(null)

  function printSpec(id: string) {
    setPrintId(id)
    setPrintMode("single")
    window.setTimeout(() => window.print(), 0)
  }

  function printVisibleSpecs() {
    setPrintId(null)
    setPrintMode("filtered")
    window.setTimeout(() => window.print(), 0)
  }

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
      serve_extras: c.extras || "",
      ingredients: c.ingredients.map((i) => ({ ingredient: i.ingredient, ml: i.ml })),
    })
  }

  return (
    <>
      <div className="controls">
        <div className="controls-row"><span className="controls-label">Cocktail library</span><div className="controls-actions"><button type="button" className="btn-secondary" onClick={printVisibleSpecs}>Print shown specs</button><button type="button" className="btn-primary" onClick={() => setAddingCocktail(true)}>+ Add Cocktail</button></div></div>
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

      <div className={printMode === "filtered" ? "print-selection" : undefined}>
      {filtered.length === 0 ? (
        <p className="muted empty">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        grouped.map((g) => (
          <section key={g.category} className="category">
            <h2 className="category-title">
              {CATEGORY_LABEL[g.category]} <span className="category-count">{g.items.length}</span>
            </h2>
            <div className="grid grid-row-priority-tight">
              {g.items.map((c) => (
                <article key={c.id} className={`card ${printId === c.id ? "print-target" : ""}`}>
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
                    <button type="button" className="btn-quiet" onClick={() => printSpec(c.id)} aria-label={`Print spec for ${c.name}`}>Print</button>
                    <form action={archiveCocktail}><input type="hidden" name="id" value={c.id} /><button type="submit" className="btn-quiet">Archive</button></form>
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
                  {c.extras ? (
                    <section className="extras-card" aria-label={`Extras for ${c.name}`}>
                      <h4>Extras</h4>
                      <div className="extras-list">
                        {c.extras.split(/\r?\n|,/).map((extra) => extra.trim()).filter(Boolean).map((extra, index) => (
                          <p key={index}>{extra}</p>
                        ))}
                    </div>
                    </section>
                  ) : null}
                  {c.premixSpecs.map((spec) => {
                    const stock = spec.premix
                    const isLow = stock ? stock.current <= stock.threshold : false
                    const fill = stock ? Math.min(100, Math.max(0, (stock.current / (stock.target || 1)) * 100)) : 0
                    return (
                      <section className="premix-spec-card" key={spec.id}>
                        <h4>Premix build</h4>
                        {spec.premixNote ? <div className="premix-note">{spec.premixNote.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}</div> : null}
                        {spec.batchNote ? <div className="batch-note"><span>Batch note</span><p>{spec.batchNote}</p></div> : null}
                        {stock ? (
                          <div className="linked-stock">
                            <div className="linked-stock-head">
                              <span>Inventory · {stock.name}</span>
                              <strong className={isLow ? "text-danger" : ""}>{stock.current} / {stock.target}</strong>
                            </div>
                            <div className="stock-bar-track"><div className={`stock-bar-fill ${isLow ? "bg-danger" : "bg-accent"}`} style={{ width: `${fill}%` }} /></div>
                            <p>{isLow ? `Below minimum of ${stock.threshold}` : `Minimum stock: ${stock.threshold}`}</p>
                            {stock.recipe.length > 0 ? (
                              <ul className="linked-recipe">
                                {stock.recipe.map((item) => <li key={item.id}>{item.ingredient_name} <span>{item.amount_per_batch} {item.unit}</span></li>)}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    )
                  })}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
      </div>

      {editingSpec && (
        <EditSpecModal spec={editingSpec} onClose={() => setEditingSpec(null)} />
      )}
      {addingCocktail && <EditSpecModal mode="create" spec={{ id: "", name: "", category: "REGULAR", is_batched: false, technique: "", glassware: "", straining: "", garnish: "", serve_extras: "", ingredients: [] }} onClose={() => setAddingCocktail(false)} />}
    </>
  )
}
