"use client"

import { useMemo, useState, useTransition } from "react"
import { reverseStockAdjustment } from "@/app/actions"
import type { StockHistoryEvent } from "@/lib/queries"
import { CsvExportButton } from "./csv-export-button"

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
}

function formatChange(event: StockHistoryEvent) {
  if (event.event_type === "PRODUCTION") return `+${event.quantity ?? 0} bottles produced`
  const delta = event.delta ?? 0
  return `${delta > 0 ? "+" : ""}${delta} bottles · ${event.old_value} → ${event.new_value}`
}

function ReverseAdjustmentButton({ event }: { event: StockHistoryEvent }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function reverse() {
    if (!window.confirm(`Reverse the ${event.delta} bottle adjustment for ${event.premix_name}? This adds an equal-and-opposite audit event.`)) return
    setMessage(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("adjustment_id", event.event_id.replace("adjustment-", ""))
        await reverseStockAdjustment(formData)
        setMessage("Reversed")
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Unable to reverse adjustment.")
      }
    })
  }

  if (event.reversed_by_id !== null) return <span className="muted">Reversed</span>
  if (event.reversal_of_id !== null) return <span className="muted">Undo event</span>
  return (
    <span>
      <button type="button" className="btn-quiet" onClick={reverse} disabled={isPending}>{isPending ? "Reversing…" : "Undo"}</button>
      {message ? <span className="stock-action-message" role="status">{message}</span> : null}
    </span>
  )
}

export function StockHistory({ events }: { events: StockHistoryEvent[] }) {
  const [premixFilter, setPremixFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState<"ALL" | StockHistoryEvent["event_type"]>("ALL")

  const premixes = useMemo(() => (
    [...new Map(events.map((event) => [event.premix_id, event.premix_name])).entries()]
      .sort(([, a], [, b]) => a.localeCompare(b))
  ), [events])

  const filtered = useMemo(() => events.filter((event) => (
    (premixFilter === "ALL" || event.premix_id === premixFilter)
      && (typeFilter === "ALL" || event.event_type === typeFilter)
  )), [events, premixFilter, typeFilter])

  return (
    <section className="production-plan stock-history" aria-labelledby="stock-history-heading">
      <div className="production-plan-head">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h2 id="stock-history-heading">Stock history</h2>
          <p className="muted">The latest 100 production batches and manual stock adjustments. Use reasons and notes to make corrections traceable.</p>
        </div>
        <div className="production-plan-head-actions">
          <span className="plan-count">{filtered.length} events</span>
          <CsvExportButton
            filename="batchbrain-stock-history.csv"
            headers={["Date", "Premix", "Type", "Quantity", "Old stock", "New stock", "Delta", "Reason", "Notes"]}
            rows={filtered.map((event) => [event.event_date, event.premix_name, event.event_type, event.quantity, event.old_value, event.new_value, event.delta, event.reason, event.notes])}
            label="Export history"
          />
        </div>
      </div>

      <div className="controls-row stock-history-filters">
        <label>
          Premix
          <select value={premixFilter} onChange={(event) => setPremixFilter(event.target.value)}>
            <option value="ALL">All premixes</option>
            {premixes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>
          Event type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="ALL">All events</option>
            <option value="PRODUCTION">Production</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="muted empty">No stock history matches these filters.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Premix</th>
                <th>Type</th>
                <th>Change</th>
                <th>Reason / notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.event_id}>
                  <td>{formatDate(event.event_date)}</td>
                  <td className="name"><strong>{event.premix_name}</strong></td>
                  <td><span className={`stock-badge ${event.event_type === "PRODUCTION" ? "badge-ok" : "badge-warn"}`}>{event.event_type === "PRODUCTION" ? "Production" : "Adjustment"}</span></td>
                  <td className="num">{formatChange(event)}</td>
                  <td>{[event.reason, event.notes].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{event.event_type === "ADJUSTMENT" ? <ReverseAdjustmentButton event={event} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
