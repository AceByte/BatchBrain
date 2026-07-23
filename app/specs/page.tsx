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
      <h1>Spec Sheets</h1>
      {CATEGORY_ORDER.map((category) => {
        const inCategory = cocktails.filter((c) => c.category === category)
        if (inCategory.length === 0) return null
        return (
          <section key={category}>
            <h2>{CATEGORY_LABEL[category]}</h2>
            {inCategory.map((c) => {
              const ingredients = specsByCocktail.get(c.id) ?? []
              return (
                <div key={c.id} style={{ marginBottom: "1rem" }}>
                  <h3 style={{ marginBottom: "0.25rem" }}>
                    {c.name}
                    {c.is_batched ? " (batched)" : ""}
                  </h3>
                  <div>
                    {ingredients.length === 0
                      ? "No spec recorded"
                      : ingredients.map((i) => `${i.ingredient} ${i.ml}ml`).join(" · ")}
                  </div>
                  <div style={{ color: "#666", fontSize: "0.9rem" }}>
                    {[
                      c.technique && `Technique: ${c.technique}`,
                      c.glassware && `Glass: ${c.glassware}`,
                      c.straining && `Straining: ${c.straining}`,
                      c.garnish && `Garnish: ${c.garnish}`,
                      c.serve_extras && `Extras: ${c.serve_extras}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
