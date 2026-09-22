"use client"

import { useState, useTransition } from "react"
import { adjustStock, logProduction } from "@/app/actions"

type ActionKind = "production" | "adjustment"

export function StockActionForms({
  premixId,
  premixName,
  currentBottles,
  layout,
}: {
  premixId: string
  premixName: string
  currentBottles: number
  layout: "card" | "table"
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function submit(kind: ActionKind) {
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const formData = new FormData(form)
      setMessage(null)

      startTransition(async () => {
        try {
          if (kind === "production") {
            await logProduction(formData)
            form.reset()
            setMessage({ type: "success", text: "Batch logged." })
          } else {
            await adjustStock(formData)
            setMessage({ type: "success", text: "Stock updated." })
          }
        } catch (cause) {
          setMessage({
            type: "error",
            text: cause instanceof Error ? cause.message : "Unable to update stock. Please try again.",
          })
        }
      })
    }
  }

  const isCard = layout === "card"
  const formClassName = isCard ? "card-action-form" : "inline"

  return (
    <div className={isCard ? "card-actions" : "stock-actions-table"}>
      <form onSubmit={submit("production")} className={formClassName}>
        <input type="hidden" name="premix_id" value={premixId} />
        {isCard ? <label className="action-label" htmlFor={`prod-${premixId}`}>Log Batch</label> : null}
        <div className={isCard ? "action-input-group" : undefined}>
          <input
            id={`prod-${premixId}`}
            type="number"
            name="produced_bottles"
            min="0.01"
            step="0.01"
            placeholder="+ bottles"
            aria-label={`Bottles produced for ${premixName}`}
            required
            disabled={isPending}
            style={isCard ? undefined : { width: "5.5rem" }}
          />
          <input
            type="date"
            name="production_date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            aria-label={`Production date for ${premixName}`}
            disabled={isPending}
            title="Optional batch date"
          />
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Saving…" : "+ Add"}
          </button>
        </div>
        <input
          type="text"
          name="notes"
          placeholder="Optional batch notes"
          aria-label={`Production notes for ${premixName}`}
          disabled={isPending}
        />
      </form>

      <form onSubmit={submit("adjustment")} className={formClassName}>
        <input type="hidden" name="premix_id" value={premixId} />
        {isCard ? <label className="action-label" htmlFor={`set-${premixId}`}>Set Stock</label> : null}
        <div className={isCard ? "action-input-group" : undefined}>
          <input
            id={`set-${premixId}`}
            type="number"
            name="new_value"
            min="0"
            step="0.01"
            defaultValue={currentBottles}
            aria-label={`Set stock for ${premixName}`}
            required
            disabled={isPending}
            style={isCard ? undefined : { width: "5.5rem" }}
          />
          <button type="submit" className="btn-secondary" disabled={isPending}>
            {isPending ? "Saving…" : "Set"}
          </button>
        </div>
        <input
          type="text"
          name="reason"
          placeholder="Reason (e.g. count correction)"
          aria-label={`Adjustment reason for ${premixName}`}
          disabled={isPending}
        />
        <input
          type="text"
          name="notes"
          placeholder="Optional adjustment notes"
          aria-label={`Adjustment notes for ${premixName}`}
          disabled={isPending}
        />
      </form>

      {message ? <p className={`stock-action-message ${message.type}`} role="status">{message.text}</p> : null}
    </div>
  )
}
