import { getCocktailPremixSpecs, getCocktailSpecs, getCocktails, getPremixes, getRecipeItems } from "@/lib/queries"
import { SpecsBrowser, type SpecCard } from "@/components/specs-browser"

export const dynamic = "force-dynamic"

export default async function SpecsPage() {
  const [cocktails, specs, premixes, recipeItems, cocktailPremixSpecs] = await Promise.all([
    getCocktails(),
    getCocktailSpecs(),
    getPremixes(),
    getRecipeItems(),
    getCocktailPremixSpecs(),
  ])

  const specsByCocktail = new Map<string, typeof specs>()
  for (const s of specs) {
    const list = specsByCocktail.get(s.cocktail_id) ?? []
    list.push(s)
    specsByCocktail.set(s.cocktail_id, list)
  }

  const recipeByPremix = new Map<string, typeof recipeItems>()
  for (const item of recipeItems) {
    const items = recipeByPremix.get(item.premix_id) ?? []
    items.push(item)
    recipeByPremix.set(item.premix_id, items)
  }

  const cards: SpecCard[] = cocktails.map((c) => {
    const premix = premixes.find((item) => item.premix_id === c.id)
    const premixSpecs = cocktailPremixSpecs
      .filter((spec) => spec.cocktail_id === c.id)
      .map((spec) => {
        return {
          id: String(spec.id),
          premixNote: spec.premix_note,
          batchNote: spec.batch_note,
          premix: premix
            ? {
                name: premix.name,
                current: premix.current_bottles,
                target: premix.target_bottles,
                threshold: premix.threshold_bottles,
                recipe: recipeByPremix.get(premix.premix_id) ?? [],
              }
            : null,
        }
      })

    return {
      id: c.id,
      name: c.name,
      category: c.category,
      is_batched: c.is_batched,
      meta: [
        { label: "Technique", value: c.technique },
        { label: "Glass", value: c.glassware },
        { label: "Straining", value: c.straining },
        { label: "Extras", value: c.serve_extras },
        { label: "Garnish", value: c.garnish },
      ].filter((m): m is { label: string; value: string } => Boolean(m.value)),
      extras: c.serve_extras,
      premixSpecs,
      ingredients: (specsByCocktail.get(c.id) ?? []).map((i) => ({
        id: i.id,
        ingredient: i.ingredient,
        ml: i.ml,
      })),
    }
  })

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Cocktail library</p>
        <h1>Spec Sheets</h1>
        <p className="muted">{cocktails.length} recipes · search or filter by category.</p>
      </header>
      <SpecsBrowser cards={cards} />
    </>
  )
}