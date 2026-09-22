import { StockActionForms } from "./stock-action-forms"
import type { StockPremixCard } from "./stock-types"

export function StockGrid({ premixes, onEdit }: { premixes: StockPremixCard[]; onEdit: (premix: StockPremixCard) => void }) {
  return (
    <div className="grid grid-row-priority-tight">
      {premixes.map((premix) => {
        const isLow = premix.current_bottles <= premix.threshold_bottles
        const fillPct = Math.min(100, Math.max(0, (premix.current_bottles / (premix.target_bottles || 1)) * 100))
        const stockDelta = Math.max(0, premix.target_bottles - premix.current_bottles)

        return (
          <article key={premix.premix_id} className={`card stock-card ${isLow ? "card-low" : ""}`}>
            <div className="card-head">
              <div className="card-title-group">
                <h3>{premix.name}</h3>
                <span className={`stock-badge ${isLow ? "badge-danger" : "badge-ok"}`}>
                  {isLow ? "Low Stock" : "In Stock"}
                </span>
              </div>
              <button
                type="button"
                className="btn-edit-icon"
                onClick={() => onEdit(premix)}
                title="Edit Premix & Targets"
                aria-label={`Edit ${premix.name}`}
              >
                Edit
              </button>
            </div>

            <div className="stock-level-box">
              <div className="stock-numbers">
                <div>
                  <span className="stock-label">Current</span>
                  <strong className={`stock-value ${isLow ? "text-danger" : ""}`}>{premix.current_bottles}</strong>
                </div>
                <div>
                  <span className="stock-label">Target</span>
                  <span className="stock-value-sub">{premix.target_bottles}</span>
                </div>
                <div>
                  <span className="stock-label">Min Threshold</span>
                  <span className="stock-value-sub">{premix.threshold_bottles}</span>
                </div>
              </div>

              <div className="stock-bar-track">
                <div
                  className={`stock-bar-fill ${isLow ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <p className={`stock-helper ${isLow ? "text-danger" : ""}`}>
                {isLow
                  ? `${stockDelta} bottles needed to reach target`
                  : `${Math.round(fillPct)}% of target on hand`}
              </p>
            </div>

            {premix.recipe.length === 0 ? (
              <p className="muted empty-recipe">No spec recorded.</p>
            ) : (
              <ul className="recipe">
                {premix.recipe.map((item) => (
                  <li key={item.id}>
                    <span className="ing-name">{item.ingredient_name}</span>
                    <span className="amount">{item.amount_per_batch} {item.unit}</span>
                  </li>
                ))}
              </ul>
            )}

            {premix.preparation_notes ? (
              <section className="extras-card" aria-label={`Preparation notes for ${premix.name}`}>
                <h4>Prep Notes</h4>
                <div className="extras-list">
                  {premix.preparation_notes
                    .split(/\r?\n|,/)
                    .map((entry) => entry.trim())
                    .filter(Boolean)
                    .map((entry, index) => <p key={index}>{entry}</p>)}
                </div>
              </section>
            ) : null}

            <StockActionForms
              premixId={premix.premix_id}
              premixName={premix.name}
              currentBottles={premix.current_bottles}
              layout="card"
            />
          </article>
        )
      })}
    </div>
  )
}
