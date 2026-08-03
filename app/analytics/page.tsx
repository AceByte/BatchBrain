import { getAnalytics } from "@/lib/queries"

export const dynamic = "force-dynamic"

const CATEGORY_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  SEASONAL: "Seasonal",
  SIGNATURE: "Signature",
  INGREDIENTS: "Ingredients",
}

function statusBadge(current: number, threshold: number, target: number): { label: string; cls: string } {
  if (current <= threshold) return { label: "Low", cls: "badge-danger" }
  if (current < target * 0.5) return { label: "Running low", cls: "badge-warn" }
  return { label: "Stocked", cls: "badge-ok" }
}

export default async function AnalyticsPage() {
  const { overview, recent, stockHealth, ingredientDemand, categoryBreakdown } = await getAnalytics()

  const lowPremixes = stockHealth.filter((p) => p.current_bottles <= p.threshold_bottles)
  const runningLow = stockHealth.filter((p) => p.current_bottles > p.threshold_bottles && p.current_bottles < p.target_bottles * 0.5)
  const needAttention = lowPremixes.length > 0 || runningLow.length > 0

  return (
    <div className="analytics-page">
      <header className="page-head">
        <p className="eyebrow">Operations overview</p>
        <h1>Analytics</h1>
        <p className="muted">Inventory health, production priorities, and purchasing insights.</p>
      </header>

      <div className="analytics-grid">
        <div className="analytics-row analytics-row-kpis">
          <div className="kpi-row">
          <div className="kpi-card">
            <span className="kpi-label">Active premixes</span>
            <strong className="kpi-value">{overview.premix_count}</strong>
          </div>
          <div className={`kpi-card ${overview.low_count > 0 ? "kpi-alert" : ""}`}>
            <span className="kpi-label">Need production</span>
            <strong className="kpi-value">{overview.low_count}</strong>
            {overview.low_count > 0 && <span className="kpi-sub">Requires attention</span>}
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Active cocktails</span>
            <strong className="kpi-value">{overview.cocktail_count}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Produced (30d)</span>
            <strong className="kpi-value">{overview.produced_last_30_days}</strong>
            <span className="kpi-sub">bottles made</span>
          </div>
          </div>
        </div>

        <div className="analytics-row analytics-row-paired">
          {needAttention && (
            <section className="analytics-section">
              <div className="analytics-section-header">
                <p className="eyebrow">Action required</p>
                <h2>Production priority</h2>
                <p className="muted">Premixes that need attention, ranked by urgency.</p>
              </div>
              <div className="analytics-section-body">
                <div className="priority-grid">
                  {lowPremixes.map((p) => {
                    const fillPct = Math.min(100, Math.max(0, (p.current_bottles / (p.target_bottles || 1)) * 100))
                    return (
                      <div key={p.premix_id} className="priority-item priority-item-critical">
                        <div className="priority-info">
                          <span className="priority-name">{p.name}</span>
                          <span className="priority-meta">
                            <span>{p.current_bottles} / {p.target_bottles} bottles</span>
                            {p.daysRemaining !== null && <span>~{p.daysRemaining} days left</span>}
                          </span>
                        </div>
                        <div className="priority-bar">
                          <div className="stock-bar-track" style={{ width: "100%" }}>
                            <div className="stock-bar-fill bg-danger" style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                        <span className="priority-badge badge-danger">Critical</span>
                      </div>
                    )
                  })}
                  {runningLow.map((p) => {
                    const fillPct = Math.min(100, Math.max(0, (p.current_bottles / (p.target_bottles || 1)) * 100))
                    return (
                      <div key={p.premix_id} className="priority-item priority-item-warn">
                        <div className="priority-info">
                          <span className="priority-name">{p.name}</span>
                          <span className="priority-meta">
                            <span>{p.current_bottles} / {p.target_bottles} bottles</span>
                            {p.daysRemaining !== null && <span>~{p.daysRemaining} days left</span>}
                          </span>
                        </div>
                        <div className="priority-bar">
                          <div className="stock-bar-track" style={{ width: "100%" }}>
                            <div className="stock-bar-fill bg-warn" style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                        <span className="priority-badge badge-warn">Running low</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="analytics-section">
            <div className="analytics-section-header">
              <p className="eyebrow">Stock health</p>
              <h2>All premixes</h2>
              <p className="muted">Current stock levels and estimated runway based on 30-day usage.</p>
            </div>
            <div className="analytics-section-body">
              <div className="stock-grid">
                <div className="stock-grid-header">
                  <span>Premix</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span>Runway</span>
                </div>
                {stockHealth.map((p) => {
                  const fillPct = Math.min(100, Math.max(0, (p.current_bottles / (p.target_bottles || 1)) * 100))
                  const status = statusBadge(p.current_bottles, p.threshold_bottles, p.target_bottles)
                  const isLow = p.current_bottles <= p.threshold_bottles
                  return (
                    <div key={p.premix_id} className={`stock-row ${isLow ? "stock-row-low" : ""}`}>
                      <span className="stock-cell-name">{p.name}</span>
                      <span className="stock-cell-bar-wrap">
                        <span className="stock-bar-track"><span className={`stock-bar-fill ${isLow ? "bg-danger" : "bg-accent"}`} style={{ width: `${fillPct}%` }} /></span>
                        <span className="stock-cell-nums">{p.current_bottles} / {p.target_bottles}</span>
                      </span>
                      <span className="stock-cell-badge"><span className={`stock-badge ${status.cls}`}>{status.label}</span></span>
                      <span className="stock-cell-runway">{p.daysRemaining !== null ? `~${p.daysRemaining}d` : "—"}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="analytics-row analytics-row-paired">
          <section className="analytics-section">
            <div className="analytics-section-header">
              <p className="eyebrow">Purchasing</p>
              <h2>Ingredient demand</h2>
              <p className="muted">Total amount needed per batch across all premix recipes.</p>
            </div>
            <div className="analytics-section-body">
              <div className="demand-grid">
                <div className="demand-grid-header">
                  <span>Ingredient</span>
                  <span>Amount</span>
                  <span>Used in</span>
                </div>
                {ingredientDemand.map((item) => (
                  <div key={`${item.ingredient_name}-${item.unit}`} className="demand-row">
                    <span className="demand-cell-name">{item.ingredient_name}</span>
                    <span className="demand-cell-amount"><strong>{item.total_amount}</strong><span className="unit">{item.unit}</span></span>
                    <span className="demand-cell-premix">{item.premix_count} premix{item.premix_count === 1 ? "" : "es"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-header">
              <p className="eyebrow">Menu</p>
              <h2>Cocktails by category</h2>
              <p className="muted">Batched vs made-to-order split per category.</p>
            </div>
            <div className="analytics-section-body">
              <div className="cat-grid">
                {categoryBreakdown.map((c) => {
                  const batchedPct = c.total > 0 ? Math.round((c.batched_count / c.total) * 100) : 0
                  return (
                    <div key={c.category} className="cat-card">
                      <span className="cat-card-label">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                      <div className="cat-card-stats">
                        <span className="cat-card-total">{c.total}</span>
                        <span className="cat-card-sub">{c.batched_count} batched<br />{c.total - c.batched_count} MTO</span>
                      </div>
                      <div className="cat-bar-track">
                        <div className="cat-bar-fill" style={{ width: `${batchedPct}%` }} />
                      </div>
                      <span className="cat-card-pct">{batchedPct}% batched</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <section className="analytics-section analytics-span-full">
          <div className="analytics-section-header">
            <p className="eyebrow">Recent activity</p>
            <h2>Stock changes</h2>
          </div>
          <div className="analytics-section-body">
            {recent.length === 0 ? (
              <p className="muted">No stock activity recorded yet.</p>
            ) : (
              <div className="activity-grid">
                {recent.map((event, index) => (
                  <div key={`${event.happened_at}-${index}`} className="activity-item">
                    <div className="activity-info">
                      <strong>{event.name}</strong>
                      <span className="activity-meta">{event.reason || "Manual adjustment"} · {new Date(event.happened_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`activity-delta ${event.delta < 0 ? "delta-negative" : "delta-positive"}`}>
                      {event.delta > 0 ? "+" : ""}{event.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}