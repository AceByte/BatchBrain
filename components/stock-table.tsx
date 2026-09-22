import { StockActionForms } from "./stock-action-forms"
import type { StockPremixCard } from "./stock-types"

export function StockTable({ premixes, onEdit }: { premixes: StockPremixCard[]; onEdit: (premix: StockPremixCard) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Premix</th>
            <th>Status</th>
            <th className="num">Current</th>
            <th className="num">Target</th>
            <th className="num">Threshold</th>
            <th>Ingredients / Batch</th>
            <th>Log Batch</th>
            <th>Set Stock</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {premixes.map((premix) => {
            const isLow = premix.current_bottles <= premix.threshold_bottles

            return (
              <tr key={premix.premix_id} className={isLow ? "low" : undefined}>
                <td className="name">
                  <strong>{premix.name}</strong>
                </td>
                <td>
                  <span className={`stock-badge ${isLow ? "badge-danger" : "badge-ok"}`}>
                    {isLow ? "Low Stock" : "OK"}
                  </span>
                </td>
                <td className="num">{premix.current_bottles}</td>
                <td className="num">{premix.target_bottles}</td>
                <td className="num">{premix.threshold_bottles}</td>
                <td className="ingredients">
                  {premix.recipe.length === 0
                    ? "—"
                    : premix.recipe.map((item) => `${item.ingredient_name} ${item.amount_per_batch} ${item.unit}`).join(", ")}
                </td>
                <td colSpan={2}>
                  <StockActionForms
                    premixId={premix.premix_id}
                    premixName={premix.name}
                    currentBottles={premix.current_bottles}
                    layout="table"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-edit-icon"
                    onClick={() => onEdit(premix)}
                    title="Edit Premix"
                    aria-label={`Edit ${premix.name}`}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
