import { getPremixes, getRecipeItems } from "@/lib/queries"
import { adjustStock, logProduction } from "./actions"

export const dynamic = "force-dynamic"

export default async function StockPage() {
  const [premixes, recipeItems] = await Promise.all([getPremixes(), getRecipeItems()])

  const itemsByPremix = new Map<string, typeof recipeItems>()
  for (const item of recipeItems) {
    const list = itemsByPremix.get(item.premix_id) ?? []
    list.push(item)
    itemsByPremix.set(item.premix_id, list)
  }

  const lowCount = premixes.filter((p) => p.current_bottles <= p.threshold_bottles).length

  return (
    <>
      <h1>Premix Stock</h1>
      <p>
        {premixes.length} premixes &middot; {lowCount} at or below threshold
      </p>

      <table>
        <thead>
          <tr>
            <th>Premix</th>
            <th>Current</th>
            <th>Target</th>
            <th>Threshold</th>
            <th>Ingredients / batch</th>
            <th>Log production</th>
            <th>Set stock</th>
          </tr>
        </thead>
        <tbody>
          {premixes.map((p) => {
            const low = p.current_bottles <= p.threshold_bottles
            const items = itemsByPremix.get(p.premix_id) ?? []
            return (
              <tr key={p.premix_id} className={low ? "low" : undefined}>
                <td>
                  {p.name}
                  {low ? " (low)" : ""}
                </td>
                <td>{p.current_bottles}</td>
                <td>{p.target_bottles}</td>
                <td>{p.threshold_bottles}</td>
                <td>
                  {items.length === 0
                    ? "—"
                    : items
                        .map((i) => `${i.ingredient_name} ${i.amount_per_batch} ${i.unit}`)
                        .join(", ")}
                </td>
                <td>
                  <form action={logProduction} className="inline">
                    <input type="hidden" name="premix_id" value={p.premix_id} />
                    <input
                      type="number"
                      name="produced_bottles"
                      step="0.01"
                      placeholder="bottles"
                      aria-label={`Bottles produced for ${p.name}`}
                      required
                      style={{ width: "5rem" }}
                    />
                    <button type="submit">Add</button>
                  </form>
                </td>
                <td>
                  <form action={adjustStock} className="inline">
                    <input type="hidden" name="premix_id" value={p.premix_id} />
                    <input
                      type="number"
                      name="new_value"
                      step="0.01"
                      defaultValue={p.current_bottles}
                      aria-label={`Set stock for ${p.name}`}
                      required
                      style={{ width: "5rem" }}
                    />
                    <button type="submit">Set</button>
                  </form>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
