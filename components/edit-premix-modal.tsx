"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { RecipeItem } from "@/lib/db"
import { createPremix, updatePremix } from "@/app/actions"

export type PremixEditData = {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  bottles_per_batch: number
  preparation_notes: string | null
  prep_deadline: string | null
  recipe: RecipeItem[]
}

export function EditPremixModal({
  premix,
  onClose,
  mode = "edit",
}: {
  premix: PremixEditData
  onClose: () => void
  mode?: "edit" | "create"
}) {
  const [isPending, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(premix.name)
  const [currentBottles, setCurrentBottles] = useState(premix.current_bottles)
  const [targetBottles, setTargetBottles] = useState(premix.target_bottles)
  const [thresholdBottles, setThresholdBottles] = useState(premix.threshold_bottles)
  const [bottlesPerBatch, setBottlesPerBatch] = useState(premix.bottles_per_batch)
  const [notes, setNotes] = useState(premix.preparation_notes || "")
  const [prepDeadline, setPrepDeadline] = useState(premix.prep_deadline || "")

  const [ingredients, setIngredients] = useState<
    { rowId: string; ingredient_name: string; amount_per_batch: number; unit: string }[]
  >(
    premix.recipe.length > 0
      ? premix.recipe.map((r) => ({
          rowId: crypto.randomUUID(),
          ingredient_name: r.ingredient_name,
          amount_per_batch: r.amount_per_batch,
          unit: r.unit || "ml",
        }))
      : [{ rowId: crypto.randomUUID(), ingredient_name: "", amount_per_batch: 0, unit: "ml" }]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab" || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKeyDown)
    modalRef.current?.querySelector<HTMLElement>("input, button")?.focus()
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function handleIngredientChange(
    index: number,
    field: "ingredient_name" | "amount_per_batch" | "unit",
    value: string | number
  ) {
    setIngredients((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  function handleAddIngredient() {
    setIngredients((prev) => [...prev, { rowId: crypto.randomUUID(), ingredient_name: "", amount_per_batch: 0, unit: "ml" }])
  }

  function handleRemoveIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function hasRecipeChanged(nextIngredients: { ingredient_name: string; amount_per_batch: number; unit: string }[]) {
    const normalize = (items: { ingredient_name: string; amount_per_batch: number; unit: string }[]) => items
      .filter((item) => item.ingredient_name.trim())
      .map((item) => ({ ingredient_name: item.ingredient_name.trim(), amount_per_batch: item.amount_per_batch, unit: item.unit || "ml" }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return JSON.stringify(normalize(nextIngredients)) !== JSON.stringify(normalize(premix.recipe))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (thresholdBottles > targetBottles) { setError("Minimum threshold cannot exceed target stock."); return }
    const nextIngredients = ingredients
      .filter((item) => item.ingredient_name.trim().length > 0)
      .map((item) => ({ ingredient_name: item.ingredient_name, amount_per_batch: item.amount_per_batch, unit: item.unit }))
    if (mode === "edit" && hasRecipeChanged(nextIngredients) && !window.confirm("Replace this premix recipe? The current recipe lines will be replaced transactionally.")) return
    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          name,
          current_bottles: currentBottles,
          target_bottles: targetBottles,
          threshold_bottles: thresholdBottles,
          bottles_per_batch: bottlesPerBatch,
          preparation_notes: notes || null,
          prep_deadline: prepDeadline || null,
          ingredients: nextIngredients,
        }
        if (mode === "create") await createPremix(payload)
        else await updatePremix({ premix_id: premix.premix_id, ...payload })
        onClose()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save the premix. Please try again.")
      }
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} className="modal-content" role="dialog" aria-modal="true" aria-labelledby="premix-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="premix-modal-title">{mode === "create" ? "Add Premix" : `Edit Premix: ${premix.name}`}</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-premix-name">Premix Name</label>
            <input
              id="edit-premix-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <fieldset className="fieldset-meta">
            <legend>Stock Levels & Targets</legend>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-current">Current Stock</label>
                <input
                  id="edit-current"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentBottles}
                  onChange={(e) => setCurrentBottles(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-yield">Bottles per Batch</label>
                <input id="edit-yield" type="number" min="0.01" step="0.01" value={bottlesPerBatch} onChange={(e) => setBottlesPerBatch(Number(e.target.value))} required />
              </div>

              <div className="form-group">
                <label htmlFor="edit-target">Target Stock</label>
                <input
                  id="edit-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetBottles}
                  onChange={(e) => setTargetBottles(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-threshold">Min Threshold</label>
                <input
                  id="edit-threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  max={targetBottles}
                  value={thresholdBottles}
                  onChange={(e) => setThresholdBottles(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          </fieldset>

          <div className="form-group">
            <label htmlFor="edit-notes">Preparation Notes</label>
            <textarea
              id="edit-notes"
              rows={2}
              value={notes}
              placeholder="e.g. Infuse for 24h, fine strain before bottling"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-prep-deadline">Prepare by (optional)</label>
            <input id="edit-prep-deadline" type="date" value={prepDeadline} onChange={(e) => setPrepDeadline(e.target.value)} />
            <span className="form-hint">Premixes due by this date appear in the production plan.</span>
          </div>

          <fieldset className="fieldset-ingredients">
            <legend>Recipe Ingredients per Batch</legend>
            <div className="ingredients-editor">
              {ingredients.map((ing, idx) => (
                <div key={ing.rowId} className="ingredient-row">
                  <input
                    type="text"
                    placeholder="Ingredient Name"
                    value={ing.ingredient_name}
                    onChange={(e) => handleIngredientChange(idx, "ingredient_name", e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Amount"
                    value={ing.amount_per_batch || ""}
                    onChange={(e) => handleIngredientChange(idx, "amount_per_batch", Number(e.target.value))}
                    required
                    style={{ width: "5.5rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Unit (ml, g)"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, "unit", e.target.value)}
                    required
                    style={{ width: "4.5rem" }}
                  />
                  <button
                    type="button"
                    className="btn-danger-sm"
                    onClick={() => handleRemoveIngredient(idx)}
                    title="Remove ingredient"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary-sm" onClick={handleAddIngredient}>
                + Add Ingredient
              </button>
            </div>
          </fieldset>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Premix" : "Save Premix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
