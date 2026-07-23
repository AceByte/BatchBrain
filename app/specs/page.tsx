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
      c.technique && `Technique: ${c.technique}`,
      c.glassware && `Glass: ${c.glassware}`,
      c.straining && `Straining: ${c.straining}`,
      c.garnish && `Garnish: ${c.garnish}`,
      c.serve_extras && `Extras: ${c.serve_extras}`,
    ]
      .filter(Boolean)
      .join(" · "),
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
