import type { Premix, RecipeItem } from "@/lib/db"

export type StockPremixCard = Premix & {
  recipe: RecipeItem[]
}
