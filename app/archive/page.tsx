import { getArchivedCocktailPremixSpecs, getArchivedCocktailSpecs, getArchivedCocktails } from "@/lib/queries"
import { ArchiveBrowser, type ArchiveCard } from "@/components/archive-browser"

export const dynamic = "force-dynamic"

export default async function ArchivePage() {
  const [cocktails, specs, premixSpecs] = await Promise.all([
    getArchivedCocktails(),
    getArchivedCocktailSpecs(),
    getArchivedCocktailPremixSpecs(),
  ])

  const cards: ArchiveCard[] = cocktails.map((cocktail) => ({
    key: `${cocktail.id}-${cocktail.archived_at}`,
    name: cocktail.name,
    archived_at: cocktail.archived_at,
    is_batched: cocktail.is_batched,
    meta: [
      { label: "Technique", value: cocktail.technique },
      { label: "Glass", value: cocktail.glassware },
      { label: "Straining", value: cocktail.straining },
      { label: "Garnish", value: cocktail.garnish },
    ].filter((item): item is { label: string; value: string } => Boolean(item.value)),
    extras: cocktail.serve_extras,
    recipe: specs.filter((spec) => spec.cocktail_id === cocktail.id).map((spec) => ({
      id: spec.id,
      ingredient: spec.ingredient,
      amount: spec.ml,
      unit: "ml",
    })),
    premixNotes: premixSpecs.filter((spec) => spec.cocktail_id === cocktail.id).map((spec) => ({
      id: spec.id,
      premix_note: spec.premix_note,
      batch_note: spec.batch_note,
    })),
  }))

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Reference library</p>
        <h1>Recipe Archive</h1>
        <p className="muted">{cards.length} retired cocktail recipes.</p>
      </header>
      <ArchiveBrowser cards={cards} />
    </>
  )
}
