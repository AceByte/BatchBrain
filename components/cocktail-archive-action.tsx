"use client"

import { useState, useTransition } from "react"
import { archiveCocktail, restoreCocktail } from "@/app/actions"

export function CocktailArchiveAction({ id, mode }: { id: string; mode: "archive" | "restore" }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const label = mode === "archive" ? "Archive" : "Restore"

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = mode === "archive"
      ? "Archive this cocktail and remove it from the active specs? You can restore it later."
      : "Restore this cocktail to the active specs?"
    if (!window.confirm(question)) return
    const formData = new FormData(event.currentTarget)
    setMessage(null)
    startTransition(async () => {
      try {
        if (mode === "archive") await archiveCocktail(formData)
        else await restoreCocktail(formData)
        setMessage(`${label}d.`)
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : `Unable to ${label.toLowerCase()} this cocktail.`)
      }
    })
  }

  return (
    <form onSubmit={submit} className="archive-action">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-quiet" disabled={isPending}>{isPending ? "Saving…" : label}</button>
      {message ? <span className="stock-action-message" role="status">{message}</span> : null}
    </form>
  )
}
