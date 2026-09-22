import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL || ""
const sql = neon(DATABASE_URL)

async function main() {
  console.log("Starting cocktail implementation...\n")

  // Current cocktails - will go to active tables
  const currentCocktails = [
    {
      id: "negroni",
      name: "Negroni",
      category: "REGULAR",
      technique: "Stirred",
      glassware: "Lowball",
      straining: null,
      garnish: "Orange slice",
      serve_extras: null,
      is_batched: true,
      premixId: "negroni",
      premixName: "Negroni",
      premixNote: null,
      batchNote: "3 btl Beefeater 24, 3 btl Campari, 3 btl Cocchi Americano",
      specs: [
        { ingredient: "Beefeater 24", ml: 3 },
        { ingredient: "Campari", ml: 3 },
        { ingredient: "Cocchi Americano", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Beefeater 24", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Campari", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Cocchi Americano", amount_per_batch: 3, unit: "btl" },
      ],
    },
    {
      id: "gin-basil-smash",
      name: "Gin Basil Smash",
      category: "REGULAR",
      technique: "Shake w/ ice & double strain",
      glassware: "Lowball",
      straining: "double strain",
      garnish: "Basil leaf/sprig",
      serve_extras: "cubed ice",
      is_batched: true,
      premixId: "gin-basil-smash",
      premixName: "Gin Basil Smash",
      premixNote: "basil muddled in",
      batchNote: "5 btl Beefeater 24, 2 btl Syrup",
      specs: [
        { ingredient: "Beefeater 24", ml: 5 },
        { ingredient: "Syrup", ml: 2 },
        { ingredient: "Lemon Juice", ml: 2.5 },
      ],
      recipeItems: [
        { ingredient_name: "Beefeater 24", amount_per_batch: 5, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "mai-tai",
      name: "Mai Tai",
      category: "REGULAR",
      technique: "Shake w/ ice & dirty dump",
      glassware: "Lowball",
      straining: "dirty dump",
      garnish: "Mint sprig & dried lime",
      serve_extras: "cubed ice",
      is_batched: true,
      premixId: "mai-tai",
      premixName: "Mai Tai",
      premixNote: null,
      batchNote: "2 btl Light Rum, 2 btl Dark Rum, 1 btl Cointreau, 1 btl Adriatico Amaretto, 2 btl Syrup",
      specs: [
        { ingredient: "Light Rum", ml: 2 },
        { ingredient: "Dark Rum", ml: 2 },
        { ingredient: "Cointreau", ml: 1 },
        { ingredient: "Adriatico Amaretto", ml: 1 },
        { ingredient: "Lime Juice", ml: 2 },
        { ingredient: "Orange Juice", ml: 3.5 },
        { ingredient: "Syrup", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Light Rum", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Dark Rum", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Cointreau", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Adriatico Amaretto", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "portofino",
      name: "Portofino",
      category: "REGULAR",
      technique: "Shake w/ ice & single strain",
      glassware: "Lowball",
      straining: "single strain",
      garnish: "Orange slice & umbrella",
      serve_extras: "cubed ice",
      is_batched: true,
      premixId: "portofino",
      premixName: "Portofino",
      premixNote: null,
      batchNote: "2 btl Light Rum, 2 btl Dark Rum, 1 btl Cointreau, 1 btl Amaretto, 2 btl Syrup",
      specs: [
        { ingredient: "Light Rum", ml: 2 },
        { ingredient: "Dark Rum", ml: 2 },
        { ingredient: "Cointreau", ml: 1 },
        { ingredient: "Amaretto", ml: 1 },
        { ingredient: "Lime Juice", ml: 2 },
        { ingredient: "Passion Purée", ml: 3 },
        { ingredient: "Syrup", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Light Rum", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Dark Rum", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Cointreau", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Amaretto", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "beach-boulevard",
      name: "Beach Boulevard",
      category: "REGULAR",
      technique: "Built",
      glassware: "Highball",
      straining: null,
      garnish: "Lemon slice & mint sprig",
      serve_extras: "cubed ice, BDR syrup bleed",
      is_batched: true,
      premixId: "beach-boulevard",
      premixName: "Beach Boulevard",
      premixNote: "finished with BDR syrup bleed",
      batchNote: "5 btl Beefeater 24, 2 btl Syrup",
      specs: [
        { ingredient: "Beefeater 24", ml: 5 },
        { ingredient: "Syrup", ml: 2 },
        { ingredient: "Lemon Juice", ml: 2 },
        { ingredient: "Ginger Juice", ml: 1 },
      ],
      recipeItems: [
        { ingredient_name: "Beefeater 24", amount_per_batch: 5, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "afternoon-affair",
      name: "Afternoon Affair",
      category: "REGULAR",
      technique: "Shake w/ ice & double strain",
      glassware: "Coupette",
      straining: "double strain",
      garnish: "Dry Earl Grey tea",
      serve_extras: null,
      is_batched: true,
      premixId: "afternoon-affair",
      premixName: "Afternoon Affair",
      premixNote: null,
      batchNote: "5 btl Earl Grey-infused Four Roses Whiskey, 2 btl Simple Syrup",
      specs: [
        { ingredient: "Earl Grey-infused Four Roses Whiskey", ml: 5 },
        { ingredient: "Lemon Juice", ml: 3 },
        { ingredient: "Simple Syrup", ml: 2 },
        { ingredient: "Egg White", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Earl Grey-infused Four Roses Whiskey", amount_per_batch: 5, unit: "btl" },
        { ingredient_name: "Simple Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "blanc-de-rouge",
      name: "Blanc de Rouge",
      category: "REGULAR",
      technique: "Shake w/ ice & double strain",
      glassware: "Coupette",
      straining: "double strain",
      garnish: "Raspberry powder",
      serve_extras: "Top w/ Champagne",
      is_batched: true,
      premixId: "blanc-de-rouge",
      premixName: "Blanc de Rouge",
      premixNote: "Top w/ Champagne",
      batchNote: "2 btl Martell VS, 1 btl Merlet Apricot/Pêche, 1 btl Crème de Mure, 2 btl BDR Syrup",
      specs: [
        { ingredient: "Martell VS", ml: 2 },
        { ingredient: "Merlet Apricot/Pêche", ml: 1 },
        { ingredient: "Crème de Mure", ml: 1 },
        { ingredient: "Lemon Juice", ml: 2 },
        { ingredient: "BDR Syrup", ml: 2 },
        { ingredient: "Eggwhite", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Martell VS", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Merlet Apricot/Pêche", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Crème de Mure", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "BDR Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "sunset-lover",
      name: "Sunset Lover",
      category: "REGULAR",
      technique: "Shake w/ ice & double strain",
      glassware: "Coupette",
      straining: "double strain",
      garnish: "Dried lime & Peychaud's bitters",
      serve_extras: null,
      is_batched: true,
      premixId: "sunset-lover",
      premixName: "Sunset Lover",
      premixNote: null,
      batchNote: "2 btl Absolut Elyx, 1 btl Yellow Chartreuse, 1 btl Aperol, 1 btl St. Germain, 1.5 btl Syrup",
      specs: [
        { ingredient: "Absolut Elyx", ml: 2 },
        { ingredient: "Yellow Chartreuse", ml: 1 },
        { ingredient: "Aperol", ml: 1 },
        { ingredient: "St. Germain", ml: 1 },
        { ingredient: "Syrup", ml: 1.5 },
        { ingredient: "Lemon Juice", ml: 2.5 },
        { ingredient: "Eggwhite", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Absolut Elyx", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Yellow Chartreuse", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Aperol", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "St. Germain", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 1.5, unit: "btl" },
      ],
    },
    {
      id: "bloom-and-burn",
      name: "Bloom & Burn",
      category: "REGULAR",
      technique: "Shake w/ ice & double strain",
      glassware: "Highball",
      straining: "double strain",
      garnish: "Dried lime",
      serve_extras: "3–4 ice cubes, Top w/ soda water",
      is_batched: true,
      premixId: "bloom-and-burn",
      premixName: "Bloom & Burn",
      premixNote: "bitters/Tabasco dashed to taste",
      batchNote: "2 btl Beefeater 24, 1.5 btl Adriatico Amaretto, 1.5 btl St. Germain, 1.5 btl Syrup",
      specs: [
        { ingredient: "Beefeater 24", ml: 2 },
        { ingredient: "Adriatico Amaretto", ml: 1.5 },
        { ingredient: "St. Germain", ml: 1.5 },
        { ingredient: "Lemon Juice", ml: 2.5 },
        { ingredient: "Syrup", ml: 1.5 },
        { ingredient: "Egg White", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Beefeater 24", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Adriatico Amaretto", amount_per_batch: 1.5, unit: "btl" },
        { ingredient_name: "St. Germain", amount_per_batch: 1.5, unit: "btl" },
        { ingredient_name: "Syrup", amount_per_batch: 1.5, unit: "btl" },
      ],
    },
  ]

  // Archived cocktails
  const archivedCocktails = [
    {
      id: "ginger",
      name: "Ginger",
      category: "SEASONAL",
      is_batched: true,
      premixId: "ginger",
      premixName: "Ginger",
      specs: [
        { ingredient: "Havana 3yr", ml: 3 },
        { ingredient: "Amaretto", ml: 2 },
        { ingredient: "Ginger/Lemon/Lime Syrup", ml: 3 },
        { ingredient: "Lime Juice", ml: 2 },
        { ingredient: "Eggwhites", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Havana 3yr", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Amaretto", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Ginger/Lemon/Lime Syrup", amount_per_batch: 3, unit: "btl" },
      ],
    },
    {
      id: "playa-bonita",
      name: "Playa Bonita",
      category: "SEASONAL",
      is_batched: true,
      premixId: "playa-bonita",
      premixName: "Playa Bonita",
      specs: [
        { ingredient: "Italicus", ml: 3 },
        { ingredient: "Merlet Abricot", ml: 3 },
        { ingredient: "Gin", ml: 3 },
        { ingredient: "Lime Juice", ml: 1 },
        { ingredient: "Lime Cordial", ml: 2 },
        { ingredient: "Eggwhites", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Italicus", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Merlet Abricot", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Gin", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Lime Cordial", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "the-crowdpleaser",
      name: "The Crowdpleaser",
      category: "SEASONAL",
      is_batched: true,
      premixId: "the-crowdpleaser",
      premixName: "The Crowdpleaser",
      specs: [
        { ingredient: "Gin", ml: 4 },
        { ingredient: "Lillet Blanc", ml: 1 },
        { ingredient: "Hibiscus Syrup", ml: 5 },
        { ingredient: "Lemon Juice", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Gin", amount_per_batch: 4, unit: "btl" },
        { ingredient_name: "Lillet Blanc", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Hibiscus Syrup", amount_per_batch: 5, unit: "btl" },
      ],
    },
    {
      id: "old-french",
      name: "Old French",
      category: "SEASONAL",
      is_batched: true,
      premixId: "old-french",
      premixName: "Old French",
      specs: [
        { ingredient: "Martell VS", ml: 2 },
        { ingredient: "Lemon Juice", ml: 2 },
        { ingredient: "Sugar", ml: 1 },
      ],
      recipeItems: [
        { ingredient_name: "Martell VS", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "flor-de-mynte",
      name: "Flor de Mynte",
      category: "SEASONAL",
      is_batched: true,
      premixId: "flor-de-mynte",
      premixName: "Flor de Mynte",
      specs: [
        { ingredient: "Midori", ml: 3 },
        { ingredient: "St. Germain", ml: 2 },
        { ingredient: "Lemon Juice", ml: 3 },
        { ingredient: "Sugar Syrup", ml: 2 },
        { ingredient: "Egg Whites", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Midori", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "St. Germain", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Sugar Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "belle-amour",
      name: "Belle Amour",
      category: "SEASONAL",
      is_batched: true,
      premixId: "belle-amour",
      premixName: "Belle Amour",
      specs: [
        { ingredient: "Cointreau", ml: 3 },
        { ingredient: "Beefeater 24", ml: 2 },
        { ingredient: "Lemon Juice", ml: 3 },
        { ingredient: "Sugar Syrup", ml: 1 },
        { ingredient: "Grenadine", ml: 1 },
        { ingredient: "Egg Whites", ml: 1 },
      ],
      recipeItems: [
        { ingredient_name: "Cointreau", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Beefeater 24", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Sugar Syrup", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Grenadine", amount_per_batch: 1, unit: "btl" },
      ],
    },
    {
      id: "island-nectar",
      name: "Island Nectar",
      category: "SEASONAL",
      is_batched: true,
      premixId: "island-nectar",
      premixName: "Island Nectar",
      specs: [
        { ingredient: "Fiji Rum", ml: 5 },
        { ingredient: "Honey Syrup", ml: 2 },
        { ingredient: "Lime Juice", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Fiji Rum", amount_per_batch: 5, unit: "btl" },
        { ingredient_name: "Honey Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "dolce-vita",
      name: "Dolce Vita",
      category: "SEASONAL",
      is_batched: true,
      premixId: "dolce-vita",
      premixName: "Dolce Vita",
      specs: [
        { ingredient: "Elyx Vodka", ml: 4 },
        { ingredient: "Frangelico", ml: 2 },
        { ingredient: "Licor 43", ml: 1.5 },
        { ingredient: "Pistachio Syrup", ml: 2.5 },
        { ingredient: "Cream", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Elyx Vodka", amount_per_batch: 4, unit: "btl" },
        { ingredient_name: "Frangelico", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Licor 43", amount_per_batch: 1.5, unit: "btl" },
        { ingredient_name: "Pistachio Syrup", amount_per_batch: 2.5, unit: "btl" },
      ],
    },
    {
      id: "cosgroni",
      name: "Cosgroni",
      category: "SEASONAL",
      is_batched: true,
      premixId: "cosgroni",
      premixName: "Cosgroni",
      specs: [
        { ingredient: "Beefeater 24", ml: 3 },
        { ingredient: "Campari", ml: 2 },
        { ingredient: "Sugar", ml: 2 },
        { ingredient: "Cranberry Juice", ml: 2 },
        { ingredient: "Lime Juice", ml: 2 },
        { ingredient: "Eggwhites", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Beefeater 24", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Campari", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Sugar Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "wonderland",
      name: "Wonderland",
      category: "SEASONAL",
      is_batched: true,
      premixId: "wonderland",
      premixName: "Wonderland",
      specs: [
        { ingredient: "Havana 7yr", ml: 4 },
        { ingredient: "Pimento Dram", ml: 1 },
        { ingredient: "Crème de Mure", ml: 2 },
        { ingredient: "White Chocolate Syrup", ml: 2 },
        { ingredient: "Lemon Juice", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Havana 7yr", amount_per_batch: 4, unit: "btl" },
        { ingredient_name: "Pimento Dram", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Crème de Mure", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "White Chocolate Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "bananalicious",
      name: "Bananalicious",
      category: "SEASONAL",
      is_batched: true,
      premixId: "bananalicious",
      premixName: "Bananalicious",
      specs: [
        { ingredient: "Vanilla Vodka", ml: 3 },
        { ingredient: "Banana Liqueur", ml: 2 },
        { ingredient: "Sugar", ml: 2 },
        { ingredient: "Egg Whites", ml: 2 },
        { ingredient: "Lemon Juice", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Vanilla Vodka", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Banana Liqueur", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Sugar Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "the-muffin-man",
      name: "The Muffin Man",
      category: "SEASONAL",
      is_batched: true,
      premixId: "the-muffin-man",
      premixName: "The Muffin Man",
      specs: [
        { ingredient: "Havana 7yr", ml: 3 },
        { ingredient: "Kahlua", ml: 2 },
        { ingredient: "Honey Syrup", ml: 3 },
        { ingredient: "Ginger Syrup", ml: 1 },
        { ingredient: "Lemon Juice", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Havana 7yr", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Kahlua", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Honey Syrup", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Ginger Syrup", amount_per_batch: 1, unit: "btl" },
      ],
    },
    {
      id: "the-nutcracker-s-sour",
      name: "The Nutcracker's Sour",
      category: "SEASONAL",
      is_batched: true,
      premixId: "the-nutcracker-s-sour",
      premixName: "The Nutcracker's Sour",
      specs: [
        { ingredient: "Martell VS", ml: 3 },
        { ingredient: "Cardamom Syrup", ml: 3 },
        { ingredient: "Lemon Juice", ml: 3 },
        { ingredient: "Amaretto", ml: 1 },
        { ingredient: "Cointreau", ml: 1 },
        { ingredient: "Egg Whites", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Martell VS", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Cardamom Syrup", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "Amaretto", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Cointreau", amount_per_batch: 1, unit: "btl" },
      ],
    },
    {
      id: "naughty-and-nice",
      name: "Naughty and Nice",
      category: "SEASONAL",
      is_batched: true,
      premixId: "naughty-and-nice",
      premixName: "Naughty and Nice",
      specs: [
        { ingredient: "Havana 7yr", ml: 4 },
        { ingredient: "Cherry Heering", ml: 2 },
        { ingredient: "Cinnamon Syrup", ml: 1 },
        { ingredient: "Lime Juice", ml: 1 },
        { ingredient: "Pomegranate Juice", ml: 6 },
      ],
      recipeItems: [
        { ingredient_name: "Havana 7yr", amount_per_batch: 4, unit: "btl" },
        { ingredient_name: "Cherry Heering", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Cinnamon Syrup", amount_per_batch: 1, unit: "btl" },
      ],
    },
    {
      id: "winter-sour",
      name: "Winter Sour",
      category: "SEASONAL",
      is_batched: true,
      premixId: "winter-sour",
      premixName: "Winter Sour",
      specs: [
        { ingredient: "Vanilla Vodka", ml: 3 },
        { ingredient: "O.P. Anderson", ml: 1 },
        { ingredient: "Cherry Heering", ml: 1 },
        { ingredient: "Gløgg Mix", ml: 2 },
        { ingredient: "Lemon Juice", ml: 3 },
        { ingredient: "Egg Whites", ml: 3 },
      ],
      recipeItems: [
        { ingredient_name: "Vanilla Vodka", amount_per_batch: 3, unit: "btl" },
        { ingredient_name: "O.P. Anderson", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Cherry Heering", amount_per_batch: 1, unit: "btl" },
        { ingredient_name: "Gløgg Mix", amount_per_batch: 2, unit: "btl" },
      ],
    },
    {
      id: "copenhagen-delight",
      name: "Copenhagen Delight",
      category: "SEASONAL",
      is_batched: true,
      premixId: "copenhagen-delight",
      premixName: "Copenhagen Delight",
      specs: [
        { ingredient: "Martell VS", ml: 2 },
        { ingredient: "Manzanita", ml: 2 },
        { ingredient: "Raspberry Syrup", ml: 2 },
        { ingredient: "Lemon Juice", ml: 2 },
      ],
      recipeItems: [
        { ingredient_name: "Martell VS", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Manzanita", amount_per_batch: 2, unit: "btl" },
        { ingredient_name: "Raspberry Syrup", amount_per_batch: 2, unit: "btl" },
      ],
    },
  ]

  // Insert current cocktails
  console.log("Inserting current cocktails...\n")
  for (const cocktail of currentCocktails) {
    try {
      await sql`
        INSERT INTO cocktails (id, name, category, technique, glassware, straining, garnish, serve_extras, is_batched, created_at, updated_at)
        VALUES (${cocktail.id}, ${cocktail.name}, ${cocktail.category}, ${cocktail.technique}, ${cocktail.glassware}, ${cocktail.straining}, ${cocktail.garnish}, ${cocktail.serve_extras}, ${cocktail.is_batched}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `

      await sql`
        INSERT INTO premixes (premix_id, name, current_bottles, target_bottles, threshold_bottles, preparation_notes, created_at, updated_at)
        VALUES (${cocktail.premixId}, ${cocktail.premixName}, 0, 0, 0, null, NOW(), NOW())
        ON CONFLICT (premix_id) DO NOTHING
      `

      for (const item of cocktail.recipeItems) {
        await sql`
          INSERT INTO premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
          VALUES (${cocktail.premixId}, ${item.ingredient_name}, ${item.amount_per_batch}, ${item.unit})
          ON CONFLICT DO NOTHING
        `
      }

      for (const spec of cocktail.specs) {
        await sql`
          INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
          VALUES (${cocktail.id}, ${spec.ingredient}, ${spec.ml})
          ON CONFLICT DO NOTHING
        `
      }

      await sql`
        INSERT INTO cocktail_premix_specs (cocktail_id, premix_note, batch_note)
        VALUES (${cocktail.id}, ${cocktail.premixNote}, ${cocktail.batchNote})
        ON CONFLICT DO NOTHING
      `

      console.log(`  ✓ ${cocktail.name}`)
    } catch (err) {
      console.error(`  ✗ ${cocktail.name}:`, err)
    }
  }

  // Insert archived cocktails
  console.log("\nInserting archived cocktails...\n")
  for (const cocktail of archivedCocktails) {
    try {
      await sql`
        INSERT INTO archived_cocktails (id, name, category, is_batched, technique, glassware, straining, garnish, serve_extras, archived_at, created_at)
        VALUES (${cocktail.id}, ${cocktail.name}, ${cocktail.category}, ${cocktail.is_batched}, null, null, null, null, null, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `

      await sql`
        INSERT INTO archived_premixes (premix_id, name, preparation_notes)
        VALUES (${cocktail.premixId}, ${cocktail.premixName}, null)
        ON CONFLICT (premix_id) DO NOTHING
      `

      for (const item of cocktail.recipeItems) {
        await sql`
          INSERT INTO archived_premix_recipe_items (premix_id, ingredient_name, amount_per_batch, unit)
          VALUES (${cocktail.premixId}, ${item.ingredient_name}, ${item.amount_per_batch}, ${item.unit})
          ON CONFLICT DO NOTHING
        `
      }

      for (const spec of cocktail.specs) {
        await sql`
          INSERT INTO archived_cocktail_specs (cocktail_id, ingredient, ml)
          VALUES (${cocktail.id}, ${spec.ingredient}, ${spec.ml})
          ON CONFLICT DO NOTHING
        `
      }

      console.log(`  ✓ ${cocktail.name}`)
    } catch (err) {
      console.error(`  ✗ ${cocktail.name}:`, err)
    }
  }

  console.log("\n✓ Implementation complete!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
