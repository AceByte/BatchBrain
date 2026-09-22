"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { CocktailCategory } from "@/lib/db"
import { createCocktail, updateCocktailSpec } from "@/app/actions"

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
  mode = "edit",
}: {
  spec: SpecEditData
  onClose: () => void
  mode?: "edit" | "create"
}) {
  const [isPending, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(spec.name)
  const [category, setCategory] = useState<CocktailCategory>(spec.category)
  const [isBatched, setIsBatched] = useState(spec.is_batched)
  const [technique, setTechnique] = useState(spec.technique)
  const [glassware, setGlassware] = useState(spec.glassware)
  const [straining, setStraining] = useState(spec.straining)
  const [garnish, setGarnish] = useState(spec.garnish)
  const [serveExtras, setServeExtras] = useState(spec.serve_extras)

  const [ingredients, setIngredients] = useState<{ rowId: string; ingredient: string; ml: number }[]>(
    spec.ingredients.length > 0 ? spec.ingredients.map((item) => ({ ...item, rowId: crypto.randomUUID() })) : [{ rowId: crypto.randomUUID(), ingredient: "", ml: 0 }]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab" || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKeyDown)
    modalRef.current?.querySelector<HTMLElement>("input, button")?.focus()
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  function handleIngredientChange(index: number, field: "ingredient" | "ml", value: string | number) {
    setIngredients((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  function handleAddIngredient() {
    setIngredients((prev) => [...prev, { rowId: crypto.randomUUID(), ingredient: "", ml: 0 }])
  }

  function handleRemoveIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function hasRecipeChanged(nextIngredients: { ingredient: string; ml: number }[]) {
    const normalize = (items: { ingredient: string; ml: number }[]) => items
      .filter((item) => item.ingredient.trim())
      .map((item) => ({ ingredient: item.ingredient.trim(), ml: item.ml }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return JSON.stringify(normalize(nextIngredients)) !== JSON.stringify(normalize(spec.ingredients))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextIngredients = ingredients
      .filter((item) => item.ingredient.trim().length > 0)
      .map((item) => ({ ingredient: item.ingredient, ml: item.ml }))
    if (mode === "edit" && hasRecipeChanged(nextIngredients) && !window.confirm("Replace this cocktail recipe? The current recipe lines will be replaced transactionally.")) return
    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          name, category, is_batched: isBatched, technique: technique || null, glassware: glassware || null,
          straining: straining || null, garnish: garnish || null, serve_extras: serveExtras || null,
          ingredients: nextIngredients,
        }
        if (mode === "create") await createCocktail(payload)
        else await updateCocktailSpec({ id: spec.id, ...payload })
        onClose()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save the cocktail. Please try again.")
      }
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div ref={modalRef} className="modal-content" role="dialog" aria-modal="true" aria-labelledby="spec-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="spec-modal-title">{mode === "create" ? "Add Cocktail" : `Edit Spec: ${spec.name}`}</h2>
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
                <textarea
                  id="edit-extras"
                  rows={4}
                  placeholder={"One item per line, e.g.\nBig ice cube\nSidecar"}
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
                <div key={ing.rowId} className="ingredient-row">
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

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Cocktail" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
