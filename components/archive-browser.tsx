"use client"

import { useMemo, useState } from "react"

type ArchiveIngredient = { id: number; ingredient: string; amount: number; unit: string }
type ArchiveMeta = { label: string; value: string }

export type ArchiveCard = {
  key: string
  name: string
  archived_at: string
  is_batched: boolean
  meta: ArchiveMeta[]
  extras: string | null
  recipe: ArchiveIngredient[]
  premixNotes: { id: number; premix_note: string | null; batch_note: string | null }[]
}

export function ArchiveBrowser({ cards }: { cards: ArchiveCard[] }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((card) =>
      card.name.toLowerCase().includes(q) ||
      card.recipe.some((item) => item.ingredient.toLowerCase().includes(q)) ||
      card.meta.some((item) => item.value.toLowerCase().includes(q)),
    )
  }, [cards, query])

  return (
    <>
      <div className="controls">
        <input type="search" className="search" placeholder="Search archived cocktails or ingredients…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search archive" />
      </div>
      {filtered.length === 0 ? <p className="muted empty">{cards.length === 0 ? "Nothing archived yet." : `No matches for “${query}”.`}</p> : (
        <div className="grid">
          {filtered.map((card) => (
            <article key={card.key} className="card">
              <div className="card-head"><div className="card-title-group"><h3>{card.name}</h3>{card.is_batched ? <span className="batched">Batched</span> : null}</div><span className="tag">Archived {new Date(card.archived_at).toLocaleDateString()}</span></div>
              {card.recipe.length > 0 ? <ul className="recipe">{card.recipe.map((item) => <li key={item.id}><span className="ing-name">{item.ingredient}</span><span className="amount">{item.amount} {item.unit}</span></li>)}</ul> : <p className="muted">No recipe recorded.</p>}
              {card.meta.length > 0 ? <ul className="recipe spec-details">{card.meta.map((item) => <li key={item.label}><span className="ing-name meta-label">{item.label}</span><span className="amount meta-val">{item.value}</span></li>)}</ul> : null}
              {card.extras ? <section className="extras-card"><h4>Extras</h4><div className="extras-list">{card.extras.split(/\r?\n/).filter(Boolean).map((extra, index) => <p key={index}>{extra}</p>)}</div></section> : null}
              {card.premixNotes.map((note) => <section className="premix-spec-card" key={note.id}><h4>Premix build</h4>{note.premix_note ? <div className="premix-note">{note.premix_note.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}</div> : null}{note.batch_note ? <div className="batch-note"><span>Batch note</span><p>{note.batch_note}</p></div> : null}</section>)}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
