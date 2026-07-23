"use client"

import { useMemo, useState } from "react"

type ArchiveIngredient = { id: number; ingredient_name: string; amount_per_batch: number; unit: string }

export type ArchiveCard = {
  key: string
  premix_id: string
  name: string
  preparation_notes: string | null
  archived_at: string
  recipe: ArchiveIngredient[]
}

export function ArchiveBrowser({ cards }: { cards: ArchiveCard[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true
      return c.recipe.some((i) => i.ingredient_name.toLowerCase().includes(q))
    })
  }, [cards, query])

  return (
    <>
      <div className="controls">
        <input
          type="search"
          className="search"
          placeholder="Search archived recipes or ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search archive"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="muted empty">
          {cards.length === 0 ? "Nothing archived yet." : `No matches for “${query}”.`}
        </p>
      ) : (
        <div className="grid">
          {filtered.map((a) => (
            <article key={a.key} className="card">
              <div className="card-head">
                <h3>{a.name}</h3>
                <span className="tag">{new Date(a.archived_at).toLocaleDateString()}</span>
              </div>
              {a.recipe.length === 0 ? (
                <p className="muted">No recipe recorded.</p>
              ) : (
                <ul className="recipe">
                  {a.recipe.map((i) => (
                    <li key={i.id}>
                      <span className="ing-name">{i.ingredient_name}</span>
                      <span className="amount">
                        {i.amount_per_batch} {i.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {a.preparation_notes ? <p className="notes">{a.preparation_notes}</p> : null}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
