import { getArchivedPremixes, getArchivedRecipeItems } from "@/lib/queries"
import { ArchiveBrowser, type ArchiveCard } from "@/components/archive-browser"

export const dynamic = "force-dynamic"

export default async function ArchivePage() {
  const [archived, items] = await Promise.all([getArchivedPremixes(), getArchivedRecipeItems()])

  const cards: ArchiveCard[] = archived.map((a) => ({
    key: `${a.premix_id}-${a.archived_at}`,
    premix_id: a.premix_id,
    name: a.name,
    preparation_notes: a.preparation_notes,
    archived_at: a.archived_at,
    recipe: items
      .filter((i) => i.premix_id === a.premix_id && i.archived_at === a.archived_at)
      .map((i) => ({
        id: i.id,
        ingredient_name: i.ingredient_name,
        amount_per_batch: i.amount_per_batch,
        unit: i.unit,
      })),
  }))

  return (
    <>
      <header className="page-head">
        <h1>Recipe Archive</h1>
        <p className="muted">{archived.length} retired premix recipes.</p>
      </header>
      <ArchiveBrowser cards={cards} />
    </>
  )
}
