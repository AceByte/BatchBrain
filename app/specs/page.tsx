import { getCocktails, getCocktailSpecs } from "@/lib/queries"
import type { CocktailCategory } from "@/lib/db"

export const dynamic = "force-dynamic"

const CATEGORY_ORDER: CocktailCategory[] = ["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"]
const CATEGORY_LABEL: Record<CocktailCategory, string> = {
  REGULAR: "Regular",
  SEASONAL: "Seasonal",
  SIGNATURE: "Signature",
  INGREDIENTS: "Ingredients",
}

export default async function SpecsPage() {
  const [cocktails, specs] = await Promise.all([getCocktails(), getCocktailSpecs()])

  const specsByCocktail = new Map<string, typeof specs>()
  for (const s of specs) {
    const list = specsByCocktail.get(s.cocktail_id) ?? []
    list.push(s)
    specsByCocktail.set(s.cocktail_id, list)
  }

  return (
    <>
      <header className="page-head">
        <h1>Spec Sheets</h1>
        <p className="muted">Recipes by category.</p>
      </header>
      {CATEGORY_ORDER.map((category) => {
        const inCategory = cocktails.filter((c) => c.category === category)
        if (inCategory.length === 0) return null
        return (
          <section key={category} className="category">
            <h2 className="category-title">{CATEGORY_LABEL[category]}</h2>
            <div className="stack">
              {inCategory.map((c) => {
                const ingredients = specsByCocktail.get(c.id) ?? []
                const meta = [
                  c.technique && `Technique: ${c.technique}`,
                  c.glassware && `Glass: ${c.glassware}`,
                  c.straining && `Straining: ${c.straining}`,
                  c.garnish && `Garnish: ${c.garnish}`,
                  c.serve_extras && `Extras: ${c.serve_extras}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <article key={c.id} className="card">
                    <div className="card-head">
                      <h2>
                        {c.name}
                        {c.is_batched ? <span className="batched">Batched</span> : null}
                      </h2>
                    </div>
                    {ingredients.length === 0 ? (
                      <p className="muted">No spec recorded.</p>
                    ) : (
                      <ul className="recipe">
                        {ingredients.map((i) => (
                          <li key={i.id}>
                            <span>{i.ingredient}</span>
                            <span className="amount">{i.ml} ml</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {meta ? <p className="spec-meta">{meta}</p> : null}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
