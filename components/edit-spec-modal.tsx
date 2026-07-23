"use client"

import { useState, useTransition } from "react"
import type { CocktailCategory } from "@/lib/db"
import { updateCocktailSpec } from "@/app/actions"

export type SpecEditData = {
  id: string
  name: string
  category: CocktailCategory
  is_batched: boolean
  technique: string
  glassware: string
  straining: string
  garnish: string
  serve_extras: string
  ingredients: { ingredient: string; ml: number }[]
}

export function EditSpecModal({
  spec,
  onClose,
}: {
  spec: SpecEditData
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(spec.name)
  const [category, setCategory] = useState<CocktailCategory>(spec.category)
  const [isBatched, setIsBatched] = useState(spec.is_batched)
  const [technique, setTechnique] = useState(spec.technique)
  const [glassware, setGlassware] = useState(spec.glassware)
  const [straining, setStraining] = useState(spec.straining)
  const [garnish, setGarnish] = useState(spec.garnish)
  const [serveExtras, setServeExtras] = useState(spec.serve_extras)

  const [ingredients, setIngredients] = useState<{ ingredient: string; ml: number }[]>(
    spec.ingredients.length > 0 ? spec.ingredients : [{ ingredient: "", ml: 0 }]
  )

  function handleIngredientChange(index: number, field: "ingredient" | "ml", value: string | number) {
    setIngredients((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  function handleAddIngredient() {
    setIngredients((prev) => [...prev, { ingredient: "", ml: 0 }])
  }

  function handleRemoveIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateCocktailSpec({
        id: spec.id,
        name,
        category,
        is_batched: isBatched,
        technique: technique || null,
        glassware: glassware || null,
        straining: straining || null,
        garnish: garnish || null,
        serve_extras: serveExtras || null,
        ingredients: ingredients.filter((i) => i.ingredient.trim().length > 0),
      })
      onClose()
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Spec: {spec.name}</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="edit-name">Cocktail Name</label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-category">Category</label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CocktailCategory)}
              >
                <option value="REGULAR">Regular</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="SIGNATURE">Signature</option>
                <option value="INGREDIENTS">Ingredients</option>
              </select>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isBatched}
                onChange={(e) => setIsBatched(e.target.checked)}
              />
              <span>Is Batched Cocktail</span>
            </label>
          </div>

          <fieldset className="fieldset-meta">
            <legend>Preparation & Methods</legend>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-technique">Technique</label>
                <input
                  id="edit-technique"
                  type="text"
                  placeholder="e.g. Shaken, Stirred"
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-glassware">Glass</label>
                <input
                  id="edit-glassware"
                  type="text"
                  placeholder="e.g. Coupe, Highball"
                  value={glassware}
                  onChange={(e) => setGlassware(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-straining">Straining</label>
                <input
                  id="edit-straining"
                  type="text"
                  placeholder="e.g. Fine Strain, Double Strain"
                  value={straining}
                  onChange={(e) => setStraining(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-garnish">Garnish</label>
                <input
                  id="edit-garnish"
                  type="text"
                  placeholder="e.g. Orange Twist, Lime Wheel"
                  value={garnish}
                  onChange={(e) => setGarnish(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="edit-extras">Extras</label>
                <input
                  id="edit-extras"
                  type="text"
                  placeholder="e.g. Big Ice Cube, Sidecar"
                  value={serveExtras}
                  onChange={(e) => setServeExtras(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="fieldset-ingredients">
            <legend>Recipe Ingredients (ml)</legend>
            <div className="ingredients-editor">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="ingredient-row">
                  <input
                    type="text"
                    placeholder="Ingredient Name"
                    value={ing.ingredient}
                    onChange={(e) => handleIngredientChange(idx, "ingredient", e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ml"
                    value={ing.ml || ""}
                    onChange={(e) => handleIngredientChange(idx, "ml", Number(e.target.value))}
                    required
                    style={{ width: "6rem" }}
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
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
