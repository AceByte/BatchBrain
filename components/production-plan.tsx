"use client"

import { useMemo, useState } from "react"
import type { StockPremixCard } from "./stock-types"

type IngredientTotal = {
  name: string
  unit: string
  amount: number
}

function calculateProductionPlan(premixes: StockPremixCard[]) {
  const today = new Date().toISOString().slice(0, 10)
  const low = premixes.filter((premix) => (
    premix.current_bottles <= premix.threshold_bottles
      || Boolean(premix.prep_deadline && premix.prep_deadline <= today && premix.current_bottles < premix.target_bottles)
  ))
  const ingredients = new Map<string, IngredientTotal>()

  for (const premix of low) {
    const bottlesNeeded = Math.max(0, premix.target_bottles - premix.current_bottles)
    const batchesNeeded = Math.ceil(bottlesNeeded / premix.bottles_per_batch)

    for (const item of premix.recipe) {
      const key = `${item.ingredient_name.trim().toLowerCase()}-${item.unit.trim().toLowerCase()}`
      const current = ingredients.get(key) ?? {
        name: item.ingredient_name,
        unit: item.unit,
        amount: 0,
      }
      current.amount += item.amount_per_batch * batchesNeeded
      ingredients.set(key, current)
    }
  }

  return {
    low,
    ingredients: [...ingredients.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function ProductionPlan({ premixes }: { premixes: StockPremixCard[] }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const plan = useMemo(() => calculateProductionPlan(premixes), [premixes])

  if (plan.low.length === 0) return null

  return (
    <section className="production-plan">
      <div className="production-plan-head">
        <div>
          <p className="eyebrow">Production plan</p>
          <h2>Make next</h2>
          <p className="muted">Enough batches to bring low-stock premixes back to target, plus premixes whose preparation deadline has arrived.</p>
        </div>
        <div className="production-plan-head-actions">
          <span className="plan-count">{plan.low.length} premixes</span>
          <button
            type="button"
            className="btn-quiet plan-toggle"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>
      {!isCollapsed ? (
        <div className="plan-layout">
          <div className="plan-premixes">
            {plan.low.map((premix) => {
              const bottlesNeeded = Math.max(0, premix.target_bottles - premix.current_bottles)
              const batchesNeeded = Math.ceil(bottlesNeeded / premix.bottles_per_batch)

              return (
                <div key={premix.premix_id} className="plan-premix-section">
                  <div className="plan-premix-header">
                    <strong>{premix.name}</strong>
                    <span className="plan-bottles-needed">
                      {bottlesNeeded} bottles · {batchesNeeded} batches
                      {premix.prep_deadline ? ` · due ${premix.prep_deadline}` : ""}
                    </span>
                  </div>
                  {premix.recipe.length > 0 ? (
                    <ul className="plan-premix-recipe">
                      {premix.recipe.map((recipe) => (
                        <li key={recipe.id}>
                          <span className="ing-name">{recipe.ingredient_name}</span>
                          <span className="amount">{recipe.amount_per_batch * batchesNeeded} {recipe.unit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No recipe recorded</p>
                  )}
                </div>
              )
            })}
          </div>
          <div className="plan-totals">
            <h4>Combined Totals</h4>
            <ul className="plan-ingredients">
              {plan.ingredients.map((ingredient) => (
                <li key={`${ingredient.name}-${ingredient.unit}`}>
                  <span>{ingredient.name}</span>
                  <strong>{ingredient.amount} {ingredient.unit}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  )
}
