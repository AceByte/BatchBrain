import { getArchivedPremixes, getArchivedRecipeItems } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function ArchivePage() {
  const [archived, items] = await Promise.all([getArchivedPremixes(), getArchivedRecipeItems()])

  // Match recipe items to the same archive event (premix + archived_at).
  function itemsFor(premixId: string, archivedAt: string) {
    return items.filter((i) => i.premix_id === premixId && i.archived_at === archivedAt)
  }

  return (
    <>
      <header className="page-head">
        <h1>Recipe Archive</h1>
        <p className="muted">Previous premix recipes that have been retired.</p>
      </header>

      {archived.length === 0 ? (
        <p className="muted">Nothing archived yet.</p>
      ) : (
        <div className="stack">
          {archived.map((a) => {
            const recipe = itemsFor(a.premix_id, a.archived_at)
            return (
              <article key={`${a.premix_id}-${a.archived_at}`} className="card">
                <div className="card-head">
                  <h2>{a.name}</h2>
                  <span className="tag">Archived {new Date(a.archived_at).toLocaleDateString()}</span>
                </div>

                {recipe.length === 0 ? (
                  <p className="muted">No recipe recorded.</p>
                ) : (
                  <ul className="recipe">
                    {recipe.map((i) => (
                      <li key={i.id}>
                        <span>{i.ingredient_name}</span>
                        <span className="amount">
                          {i.amount_per_batch} {i.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {a.preparation_notes ? <p className="notes">{a.preparation_notes}</p> : null}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
