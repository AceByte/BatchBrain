"use client"

import { useState, useTransition } from "react"
import type { RecipeItem } from "@/lib/db"
import { updatePremix } from "@/app/actions"

export type PremixEditData = {
  premix_id: string
  name: string
  current_bottles: number
  target_bottles: number
  threshold_bottles: number
  preparation_notes: string | null
  recipe: RecipeItem[]
}

export function EditPremixModal({
  premix,
  onClose,
}: {
  premix: PremixEditData
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(premix.name)
  const [currentBottles, setCurrentBottles] = useState(premix.current_bottles)
  const [targetBottles, setTargetBottles] = useState(premix.target_bottles)
  const [thresholdBottles, setThresholdBottles] = useState(premix.threshold_bottles)
  const [notes, setNotes] = useState(premix.preparation_notes || "")

  const [ingredients, setIngredients] = useState<
    { ingredient_name: string; amount_per_batch: number; unit: string }[]
  >(
    premix.recipe.length > 0
      ? premix.recipe.map((r) => ({
          ingredient_name: r.ingredient_name,
          amount_per_batch: r.amount_per_batch,
          unit: r.unit || "ml",
        }))
      : [{ ingredient_name: "", amount_per_batch: 0, unit: "ml" }]
  )

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
    setIngredients((prev) => [...prev, { ingredient_name: "", amount_per_batch: 0, unit: "ml" }])
  }

  function handleRemoveIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updatePremix({
        premix_id: premix.premix_id,
        name,
        current_bottles: currentBottles,
        target_bottles: targetBottles,
        threshold_bottles: thresholdBottles,
        preparation_notes: notes || null,
        ingredients: ingredients.filter((i) => i.ingredient_name.trim().length > 0),
      })
      onClose()
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Premix: {premix.name}</h2>
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
                  value={currentBottles}
                  onChange={(e) => setCurrentBottles(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-target">Target Stock</label>
                <input
                  id="edit-target"
                  type="number"
                  step="0.01"
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

          <fieldset className="fieldset-ingredients">
            <legend>Recipe Ingredients per Batch</legend>
            <div className="ingredients-editor">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="ingredient-row">
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

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Saving..." : "Save Premix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
