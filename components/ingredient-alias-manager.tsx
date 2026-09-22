"use client"

import { useState, useTransition } from "react"
import { createIngredientAlias, deleteIngredientAlias } from "@/app/actions"
import type { IngredientAlias } from "@/lib/queries"

export function IngredientAliasManager({ aliases }: { aliases: IngredientAlias[] }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setMessage(null)
    startTransition(async () => {
      try {
        await createIngredientAlias(new FormData(form))
        form.reset()
        setMessage("Alias saved.")
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Unable to save alias.")
      }
    })
  }

  function remove(alias: string) {
    if (!window.confirm(`Remove the alias “${alias}”? Existing recipe text will not change.`)) return
    const formData = new FormData()
    formData.set("alias", alias)
    setMessage(null)
    startTransition(async () => {
      try {
        await deleteIngredientAlias(formData)
        setMessage("Alias removed.")
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Unable to remove alias.")
      }
    })
  }

  return (
    <section className="analytics-section alias-manager">
      <div className="analytics-section-header">
        <p className="eyebrow">Purchasing cleanup</p>
        <h2>Ingredient aliases</h2>
        <p className="muted">Map recipe wording to one canonical purchasing name without changing the original recipe text.</p>
      </div>
      <div className="analytics-section-body">
        <form className="alias-form" onSubmit={submit}>
          <input name="alias" placeholder="Alias, e.g. simple syrup" aria-label="Ingredient alias" required disabled={isPending} />
          <input name="canonical_name" placeholder="Canonical name, e.g. Sugar syrup" aria-label="Canonical ingredient name" required disabled={isPending} />
          <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? "Saving…" : "Add alias"}</button>
        </form>
        {aliases.length === 0 ? <p className="muted">No aliases configured yet.</p> : (
          <div className="alias-list">
            {aliases.map((item) => (
              <div className="alias-row" key={item.alias}>
                <span>{item.alias}</span><span aria-hidden="true">→</span><strong>{item.canonical_name}</strong>
                <button type="button" className="btn-quiet" onClick={() => remove(item.alias)} disabled={isPending}>Remove</button>
              </div>
            ))}
          </div>
        )}
        {message ? <p className="stock-action-message" role="status">{message}</p> : null}
      </div>
    </section>
  )
}
