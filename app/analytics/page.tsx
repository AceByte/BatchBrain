import { getAnalytics } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const { overview, recent } = await getAnalytics()
  return <>
    <header className="page-head"><p className="eyebrow">Operations overview</p><h1>Analytics</h1><p className="muted">A quick read on current inventory and recent stock activity.</p></header>
    <section className="analytics-stats" aria-label="Inventory summary">
      <article><span>Active premixes</span><strong>{overview.premix_count}</strong></article>
      <article className={overview.low_count > 0 ? "analytics-alert" : ""}><span>Need production</span><strong>{overview.low_count}</strong></article>
      <article><span>Active cocktails</span><strong>{overview.cocktail_count}</strong></article>
      <article><span>Produced, last 30 days</span><strong>{overview.produced_last_30_days}</strong></article>
    </section>
    <section className="activity-panel"><div><p className="eyebrow">Recent activity</p><h2>Stock changes</h2></div>{recent.length === 0 ? <p className="muted">No stock activity recorded yet.</p> : <ul>{recent.map((event, index) => <li key={`${event.happened_at}-${index}`}><div><strong>{event.name}</strong><span>{event.reason || "Manual adjustment"} · {new Date(event.happened_at).toLocaleDateString()}</span></div><b className={event.delta < 0 ? "text-danger" : ""}>{event.delta > 0 ? "+" : ""}{event.delta}</b></li>)}</ul>}</section>
  </>
}
