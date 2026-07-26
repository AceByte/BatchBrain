import { getPremixes, getRecipeItems } from "@/lib/queries"
import { StockBrowser } from "@/components/stock-browser"

export const dynamic = "force-dynamic"

export default async function StockPage() {
  const [premixes, recipeItems] = await Promise.all([getPremixes(), getRecipeItems()])
  const lowCount = premixes.filter((p) => p.current_bottles <= p.threshold_bottles).length

  return (
    <>
      <header className="page-head page-head-stock">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Premix Stock</h1>
          <p className="muted">Keep the bar ready for service with a clear view of every batch.</p>
        </div>
        <div className="stock-summary" aria-label="Stock summary">
          <div className="summary-item">
            <span>Total premixes</span>
            <strong>{premixes.length}</strong>
          </div>
          <div className={`summary-item ${lowCount > 0 ? "summary-alert" : ""}`}>
            <span>Needs attention</span>
            <strong>{lowCount}</strong>
          </div>
        </div>
      </header>

      <StockBrowser premixes={premixes} recipeItems={recipeItems} />
    </>
  )
}
