import { getPremixes, getRecipeItems } from "@/lib/queries"
import { StockBrowser } from "@/components/stock-browser"

export const dynamic = "force-dynamic"

export default async function StockPage() {
  const [premixes, recipeItems] = await Promise.all([getPremixes(), getRecipeItems()])
  const lowCount = premixes.filter((p) => p.current_bottles <= p.threshold_bottles).length

  return (
    <>
      <header className="page-head">
        <h1>Premix Stock</h1>
        <p className="muted">
          {premixes.length} premixes &middot; {lowCount} at or below threshold
        </p>
      </header>

      <StockBrowser premixes={premixes} recipeItems={recipeItems} />
    </>
  )
}
