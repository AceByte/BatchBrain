import { getAnalytics } from "@/lib/queries"

export const dynamic = "force-dynamic"

const CATEGORY_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  SEASONAL: "Seasonal",
  SIGNATURE: "Signature",
  INGREDIENTS: "Ingredients",
}

export default async function AnalyticsPage() {
  const { overview, recent, stockHealth, ingredientDemand, categoryBreakdown } = await getAnalytics()

  const maxIngredientAmount = Math.max(1, ...ingredientDemand.map((i) => i.total_amount))
  const maxCategoryTotal = Math.max(1, ...categoryBreakdown.map((c) => c.total))

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Operations overview</p>
        <h1>Analytics</h1>
        <p className="muted">A quick read on current inventory and recent stock activity.</p>
      </header>

      <section className="analytics-stats" aria-label="Inventory summary">
        <article><span>Active premixes</span><strong>{overview.premix_count}</strong></article>
        <article className={overview.low_count > 0 ? "analytics-alert" : ""}><span>Need production</span><strong>{overview.low_count}</strong></article>
        <article><span>Active cocktails</span><strong>{overview.cocktail_count}</strong></article>
        <article><span>Produced, last 30 days</span><strong>{overview.produced_last_30_days}</strong></article>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-head"><p className="eyebrow">Stock health</p><h2>Coverage & runway</h2><p className="muted">Every premix, worst-covered first. Runway is estimated from usage over the last 30 days.</p></div>
        <ul className="stock-health-list">
          {stockHealth.map((p) => {
            const isLow = p.current_bottles <= p.threshold_bottles
            const fillPct = Math.min(100, Math.max(0, (p.current_bottles / (p.target_bottles || 1)) * 100))
            return (
              <li key={p.premix_id} className={isLow ? "low" : undefined}>
                <div className="stock-health-row">
                  <span className="stock-health-name">{p.name}</span>
                  <span className="stock-health-nums">{p.current_bottles} / {p.target_bottles}</span>
                </div>
                <div className="stock-bar-track"><div className={`stock-bar-fill ${isLow ? "bg-danger" : "bg-accent"}`} style={{ width: `${fillPct}%` }} /></div>
                <p className="stock-health-runway">{p.daysRemaining !== null ? `~${p.daysRemaining} days of stock left at current usage` : "Not enough recent usage data to estimate runway"}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-head"><p className="eyebrow">Purchasing</p><h2>Ingredient demand</h2><p className="muted">Total amount needed per batch across all premix recipes, ranked highest first.</p></div>
        <ul className="demand-list">
          {ingredientDemand.map((item) => {
            const pct = (item.total_amount / maxIngredientAmount) * 100
            return (
              <li key={`${item.ingredient_name}-${item.unit}`}>
                <div className="demand-row">
                  <span>{item.ingredient_name}</span>
                  <strong>{item.total_amount} {item.unit}</strong>
                </div>
                <div className="stock-bar-track"><div className="stock-bar-fill bg-accent" style={{ width: `${pct}%` }} /></div>
                <p className="demand-sub">Used in {item.premix_count} premix{item.premix_count === 1 ? "" : "es"}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-head"><p className="eyebrow">Menu</p><h2>Cocktails by category</h2><p className="muted">Batched vs made-to-order split per category.</p></div>
        <ul className="category-breakdown-list">
          {categoryBreakdown.map((c) => {
            const pct = (c.total / maxCategoryTotal) * 100
            const batchedPct = c.total > 0 ? (c.batched_count / c.total) * 100 : 0
            return (
              <li key={c.category}>
                <div className="demand-row">
                  <span>{CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <strong>{c.total}</strong>
                </div>
                <div className="stock-bar-track" style={{ width: `${pct}%` }}>
                  <div className="stock-bar-fill bg-accent" style={{ width: `${batchedPct}%` }} />
                </div>
                <p className="demand-sub">{c.batched_count} batched · {c.total - c.batched_count} made to order</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="activity-panel">
        <div><p className="eyebrow">Recent activity</p><h2>Stock changes</h2></div>
        {recent.length === 0 ? <p className="muted">No stock activity recorded yet.</p> : (
          <ul>
            {recent.map((event, index) => (
              <li key={`${event.happened_at}-${index}`}>
                <div><strong>{event.name}</strong><span>{event.reason || "Manual adjustment"} · {new Date(event.happened_at).toLocaleDateString()}</span></div>
                <b className={event.delta < 0 ? "text-danger" : ""}>{event.delta > 0 ? "+" : ""}{event.delta}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}