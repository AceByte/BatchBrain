import { getCocktails, getCocktailSpecs } from "@/lib/queries"
import { SpecsBrowser, type SpecCard } from "@/components/specs-browser"

export const dynamic = "force-dynamic"

export default async function SpecsPage() {
  const [cocktails, specs] = await Promise.all([getCocktails(), getCocktailSpecs()])

  const specsByCocktail = new Map<string, typeof specs>()
  for (const s of specs) {
    const list = specsByCocktail.get(s.cocktail_id) ?? []
    list.push(s)
    specsByCocktail.set(s.cocktail_id, list)
  }

  const cards: SpecCard[] = cocktails.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    is_batched: c.is_batched,
    meta: [
      { label: "Technique", value: c.technique },
      { label: "Glass", value: c.glassware },
      { label: "Straining", value: c.straining },
      { label: "Garnish", value: c.garnish },
      { label: "Extras", value: c.serve_extras },
    ].filter((m): m is { label: string; value: string } => Boolean(m.value)),
    ingredients: (specsByCocktail.get(c.id) ?? []).map((i) => ({
      id: i.id,
      ingredient: i.ingredient,
      ml: i.ml,
    })),
  }))

  return (
    <>
      <header className="page-head">
        <h1>Spec Sheets</h1>
        <p className="muted">{cocktails.length} recipes · search or filter by category.</p>
      </header>
      <SpecsBrowser cards={cards} />
    </>
  )
}
