require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const premixData = [
  { name: 'Victor Spritz', premixNote: '5cl Premix' },
  { name: "Victor's Spicy Margarita", premixNote: '7cl Premix' },
  { name: 'Flor de Mynte', premixNote: '7cl Premix' },
  { name: 'Belle Amour', premixNote: '7cl Premix' },
  { name: 'Island Nectar', premixNote: '7cl Premix' },
  { name: 'The Nutcrackers sour', premixNote: '8cl Premix' },
  { name: 'Naughty and Nice', premixNote: '7cl Premix' },
  { name: 'Wonderland', premixNote: '9cl Premix' },
];

async function populatePremixSpecs() {
  try {
    console.log('Populating cocktail_premix_spec table...');
    let inserted = 0;
    let skipped = 0;

    for (const data of premixData) {
      // Find cocktail by name
      const cocktailResult = await sql`
        SELECT "cocktailId" as cocktail_id FROM cocktails 
        WHERE name = ${data.name}
        LIMIT 1
      `;

      if (cocktailResult.length === 0) {
        console.log(`⚠ Cocktail not found: ${data.name}`);
        skipped++;
        continue;
      }

      const cocktailId = cocktailResult[0].cocktail_id;

      // Check if spec already exists
      const existing = await sql`
        SELECT id FROM cocktail_premix_spec 
        WHERE cocktail_id = ${cocktailId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        console.log(`⊘ Spec already exists for: ${data.name}`);
        skipped++;
        continue;
      }

      // Insert spec
      await sql`
        INSERT INTO cocktail_premix_spec (cocktail_id, premix_note)
        VALUES (${cocktailId}, ${data.premixNote})
      `;

      console.log(`✓ Inserted premix spec for: ${data.name}`);
      inserted++;
    }

    console.log(`\n✓ Complete! Inserted: ${inserted}, Skipped: ${skipped}`);
  } catch (error) {
    console.error('Error populating premix specs:', error);
    process.exit(1);
  }
}

populatePremixSpecs();
