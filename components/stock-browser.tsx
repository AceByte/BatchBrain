"use client"

import { useMemo, useState } from "react"
import type { Premix, RecipeItem } from "@/lib/db"
import { adjustStock, logProduction } from "@/app/actions"
import { EditPremixModal, type PremixEditData } from "./edit-premix-modal"

export type StockPremixCard = Premix & {
  recipe: RecipeItem[]
}

export function StockBrowser({ premixes, recipeItems }: { premixes: Premix[]; recipeItems: RecipeItem[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"ALL" | "LOW" | "OK">("ALL")
  const [view, setView] = useState<"GRID" | "TABLE">("GRID")
  const [editingPremix, setEditingPremix] = useState<PremixEditData | null>(null)

  const itemsByPremix = useMemo(() => {
    const map = new Map<string, RecipeItem[]>()
    for (const item of recipeItems) {
      const list = map.get(item.premix_id) ?? []
      list.push(item)
      map.set(item.premix_id, list)
    }
    return map
  }, [recipeItems])

  const cards: StockPremixCard[] = useMemo(() => {
    return premixes.map((p) => ({
      ...p,
      recipe: itemsByPremix.get(p.premix_id) ?? [],
    }))
  }, [premixes, itemsByPremix])

  const counts = useMemo(() => {
    const low = cards.filter((c) => c.current_bottles <= c.threshold_bottles).length
    return {
      ALL: cards.length,
      LOW: low,
      OK: cards.length - low,
    }
  }, [cards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      const isLow = c.current_bottles <= c.threshold_bottles
      if (filter === "LOW" && !isLow) return false
      if (filter === "OK" && isLow) return false

      if (!q) return true
      if (c.name.toLowerCase().includes(q)) return true
      return c.recipe.some((i) => i.ingredient_name.toLowerCase().includes(q))
    })
  }, [cards, query, filter])

  function openEditModal(p: StockPremixCard) {
    setEditingPremix({
      premix_id: p.premix_id,
      name: p.name,
      current_bottles: p.current_bottles,
      target_bottles: p.target_bottles,
      threshold_bottles: p.threshold_bottles,
      preparation_notes: p.preparation_notes,
      recipe: p.recipe,
    })
  }

  return (
    <>
      <div className="controls">
        <input
          type="search"
          className="search"
          placeholder="Search premixes or ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search stock"
        />

        <div className="controls-row">
          <div className="filters" role="tablist" aria-label="Filter stock level">
            <button
              type="button"
              className={filter === "ALL" ? "chip active" : "chip"}
              aria-pressed={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            >
              All <span className="chip-count">{counts.ALL}</span>
            </button>
            <button
              type="button"
              className={filter === "LOW" ? "chip active chip-danger" : "chip chip-danger-subtle"}
              aria-pressed={filter === "LOW"}
              onClick={() => setFilter("LOW")}
            >
              Low Stock <span className="chip-count">{counts.LOW}</span>
            </button>
            <button
              type="button"
              className={filter === "OK" ? "chip active" : "chip"}
              aria-pressed={filter === "OK"}
              onClick={() => setFilter("OK")}
            >
              In Stock <span className="chip-count">{counts.OK}</span>
            </button>
          </div>

          <div className="view-toggle">
            <button
              type="button"
              className={view === "GRID" ? "toggle-btn active" : "toggle-btn"}
              onClick={() => setView("GRID")}
              title="Grid View"
              aria-label="Grid View"
            >
              Grid
            </button>
            <button
              type="button"
              className={view === "TABLE" ? "toggle-btn active" : "toggle-btn"}
              onClick={() => setView("TABLE")}
              title="Table View"
              aria-label="Table View"
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted empty">
          {cards.length === 0 ? "No premixes found." : `No matches for “${query}”.`}
        </p>
      ) : view === "GRID" ? (
        <div className="grid">
          {filtered.map((p) => {
            const isLow = p.current_bottles <= p.threshold_bottles
            const fillPct = Math.min(100, Math.max(0, (p.current_bottles / (p.target_bottles || 1)) * 100))

            return (
              <article key={p.premix_id} className={`card ${isLow ? "card-low" : ""}`}>
                <div className="card-head">
                  <div className="card-title-group">
                    <h3>{p.name}</h3>
                    <span className={`stock-badge ${isLow ? "badge-danger" : "badge-ok"}`}>
                      {isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-edit-icon"
                    onClick={() => openEditModal(p)}
                    title="Edit Premix & Targets"
                    aria-label={`Edit ${p.name}`}
                  >
                    Edit
                  </button>
                </div>

                <div className="stock-level-box">
                  <div className="stock-numbers">
                    <div>
                      <span className="stock-label">Current</span>
                      <strong className={`stock-value ${isLow ? "text-danger" : ""}`}>{p.current_bottles}</strong>
                    </div>
                    <div>
                      <span className="stock-label">Target</span>
                      <span className="stock-value-sub">{p.target_bottles}</span>
                    </div>
                    <div>
                      <span className="stock-label">Min Threshold</span>
                      <span className="stock-value-sub">{p.threshold_bottles}</span>
                    </div>
                  </div>

                  <div className="stock-bar-track">
                    <div
                      className={`stock-bar-fill ${isLow ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {p.recipe.length === 0 ? (
                  <p className="muted empty-recipe">No spec recorded.</p>
                ) : (
                  <ul className="recipe">
                    {p.recipe.map((i) => (
                      <li key={i.id}>
                        <span className="ing-name">{i.ingredient_name}</span>
                        <span className="amount">
                          {i.amount_per_batch} {i.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {p.preparation_notes ? <p className="notes">{p.preparation_notes}</p> : null}

                <div className="card-actions">
                  <form action={logProduction} className="card-action-form">
                    <input type="hidden" name="premix_id" value={p.premix_id} />
                    <label className="action-label" htmlFor={`prod-${p.premix_id}`}>
                      Log Batch
                    </label>
                    <div className="action-input-group">
                      <input
                        id={`prod-${p.premix_id}`}
                        type="number"
                        name="produced_bottles"
                        step="0.01"
                        placeholder="+ bottles"
                        aria-label={`Bottles produced for ${p.name}`}
                        required
                      />
                      <button type="submit" className="btn-primary">
                        + Add
                      </button>
                    </div>
                  </form>

                  <form action={adjustStock} className="card-action-form">
                    <input type="hidden" name="premix_id" value={p.premix_id} />
                    <label className="action-label" htmlFor={`set-${p.premix_id}`}>
                      Set Stock
                    </label>
                    <div className="action-input-group">
                      <input
                        id={`set-${p.premix_id}`}
                        type="number"
                        name="new_value"
                        step="0.01"
                        defaultValue={p.current_bottles}
                        aria-label={`Set stock for ${p.name}`}
                        required
                      />
                      <button type="submit" className="btn-secondary">
                        Set
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Premix</th>
                <th>Status</th>
                <th className="num">Current</th>
                <th className="num">Target</th>
                <th className="num">Threshold</th>
                <th>Ingredients / Batch</th>
                <th>Log Batch</th>
                <th>Set Stock</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isLow = p.current_bottles <= p.threshold_bottles
                return (
                  <tr key={p.premix_id} className={isLow ? "low" : undefined}>
                    <td className="name">
                      <strong>{p.name}</strong>
                    </td>
                    <td>
                      <span className={`stock-badge ${isLow ? "badge-danger" : "badge-ok"}`}>
                        {isLow ? "Low Stock" : "OK"}
                      </span>
                    </td>
                    <td className="num">{p.current_bottles}</td>
                    <td className="num">{p.target_bottles}</td>
                    <td className="num">{p.threshold_bottles}</td>
                    <td className="ingredients">
                      {p.recipe.length === 0
                        ? "—"
                        : p.recipe.map((i) => `${i.ingredient_name} ${i.amount_per_batch} ${i.unit}`).join(", ")}
                    </td>
                    <td>
                      <form action={logProduction} className="inline">
                        <input type="hidden" name="premix_id" value={p.premix_id} />
                        <input
                          type="number"
                          name="produced_bottles"
                          step="0.01"
                          placeholder="+ bottles"
                          aria-label={`Bottles produced for ${p.name}`}
                          required
                          style={{ width: "5.5rem" }}
                        />
                        <button type="submit" className="btn-primary">
                          + Add
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={adjustStock} className="inline">
                        <input type="hidden" name="premix_id" value={p.premix_id} />
                        <input
                          type="number"
                          name="new_value"
                          step="0.01"
                          defaultValue={p.current_bottles}
                          aria-label={`Set stock for ${p.name}`}
                          required
                          style={{ width: "5.5rem" }}
                        />
                        <button type="submit" className="btn-secondary">
                          Set
                        </button>
                      </form>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-edit-icon"
                        onClick={() => openEditModal(p)}
                        title="Edit Premix"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingPremix && (
        <EditPremixModal premix={editingPremix} onClose={() => setEditingPremix(null)} />
      )}
    </>
  )
}
