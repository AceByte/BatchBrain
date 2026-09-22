"use client"

import { useMemo, useState } from "react"
import type { Premix, RecipeItem } from "@/lib/db"
import { EditPremixModal, type PremixEditData } from "./edit-premix-modal"
import { CsvExportButton } from "./csv-export-button"
import { ProductionPlan } from "./production-plan"
import { StockGrid } from "./stock-grid"
import { StockHistory } from "./stock-history"
import { StockTable } from "./stock-table"
import type { StockPremixCard } from "./stock-types"
import type { StockHistoryEvent } from "@/lib/queries"

export function StockBrowser({ premixes, recipeItems, stockHistory }: { premixes: Premix[]; recipeItems: RecipeItem[]; stockHistory: StockHistoryEvent[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"ALL" | "LOW" | "OK">("ALL")
  const [view, setView] = useState<"GRID" | "TABLE">("GRID")
  const [editingPremix, setEditingPremix] = useState<PremixEditData | null>(null)
  const [addingPremix, setAddingPremix] = useState(false)

  const itemsByPremix = useMemo(() => {
    const map = new Map<string, RecipeItem[]>()
    for (const item of recipeItems) {
      const list = map.get(item.premix_id) ?? []
      list.push(item)
      map.set(item.premix_id, list)
    }
    return map
  }, [recipeItems])

  const cards: StockPremixCard[] = useMemo(() => (
    premixes.map((premix) => ({
      ...premix,
      recipe: itemsByPremix.get(premix.premix_id) ?? [],
    }))
  ), [premixes, itemsByPremix])

  const counts = useMemo(() => {
    const low = cards.filter((card) => card.current_bottles <= card.threshold_bottles).length
    return {
      ALL: cards.length,
      LOW: low,
      OK: cards.length - low,
    }
  }, [cards])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return cards.filter((card) => {
      const isLow = card.current_bottles <= card.threshold_bottles
      if (filter === "LOW" && !isLow) return false
      if (filter === "OK" && isLow) return false
      if (!normalizedQuery) return true

      return card.name.toLowerCase().includes(normalizedQuery)
        || card.recipe.some((item) => item.ingredient_name.toLowerCase().includes(normalizedQuery))
    })
  }, [cards, query, filter])

  const inventoryExportRows = useMemo(() => filtered.map((premix) => [
    premix.name,
    premix.current_bottles,
    premix.target_bottles,
    premix.threshold_bottles,
    premix.bottles_per_batch,
    premix.prep_deadline,
  ]), [filtered])

  function openEditModal(premix: StockPremixCard) {
    setEditingPremix({
      premix_id: premix.premix_id,
      name: premix.name,
      current_bottles: premix.current_bottles,
      target_bottles: premix.target_bottles,
      threshold_bottles: premix.threshold_bottles,
      bottles_per_batch: premix.bottles_per_batch,
      preparation_notes: premix.preparation_notes,
      prep_deadline: premix.prep_deadline,
      recipe: premix.recipe,
    })
  }

  return (
    <>
      <div className="controls">
        <div className="controls-row">
          <span className="controls-label">Stock management</span>
          <div className="controls-actions">
            <CsvExportButton
              filename="batchbrain-inventory.csv"
              headers={["Premix", "Current bottles", "Target bottles", "Threshold bottles", "Bottles per batch", "Prepare by"]}
              rows={inventoryExportRows}
              label="Export inventory"
            />
            <button type="button" className="btn-primary" onClick={() => setAddingPremix(true)}>+ Add Premix</button>
          </div>
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search premixes or ingredients…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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

      <ProductionPlan premixes={cards} />

      {filtered.length === 0 ? (
        cards.length === 0 ? (
          <section className="empty-state" aria-labelledby="empty-stock-heading">
            <p className="eyebrow">Start here</p>
            <h2 id="empty-stock-heading">Set up your first premix</h2>
            <p className="muted">Add a premix, choose its target and minimum threshold, then record the recipe ingredients used for one batch. You can adjust all of these later.</p>
            <button type="button" className="btn-primary" onClick={() => setAddingPremix(true)}>+ Add your first premix</button>
          </section>
        ) : (
          <p className="muted empty">No matches for “{query}”.</p>
        )
      ) : view === "GRID" ? (
        <StockGrid premixes={filtered} onEdit={openEditModal} />
      ) : (
        <StockTable premixes={filtered} onEdit={openEditModal} />
      )}

      <StockHistory events={stockHistory} />

      {editingPremix ? <EditPremixModal premix={editingPremix} onClose={() => setEditingPremix(null)} /> : null}
      {addingPremix ? (
        <EditPremixModal
          mode="create"
          premix={{
            premix_id: "",
            name: "",
            current_bottles: 0,
            target_bottles: 6,
            threshold_bottles: 2,
            bottles_per_batch: 1,
            preparation_notes: null,
            prep_deadline: null,
            recipe: [],
          }}
          onClose={() => setAddingPremix(false)}
        />
      ) : null}
    </>
  )
}
