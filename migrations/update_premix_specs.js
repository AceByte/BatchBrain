require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const premixData = [
  { name: 'Victor Spritz', premixNote: '5cl Premix' },
  { name: "Victor's Spicy Margarita", premixNote: '7cl Premix\n3cl lime juice' },
  { name: 'Flor de Mynte', premixNote: '7cl Premix\n3cl lemon juice\n2cl egg whites' },
  { name: 'Belle Amour', premixNote: '7cl Premix\n3cl lemon juice\n1cl egg whites' },
  { name: 'Island Nectar', premixNote: '7cl Premix\n3cl lime juice' },
  { name: 'The Nutcrackers sour', premixNote: '8cl Premix\n3cl lemon juice\n2cl egg whites' },
  { name: 'Naughty and Nice', premixNote: '7cl Premix\n6cl pomegranate juice\n1cl lime juice' },
  { name: 'Wonderland', premixNote: '9cl Premix\n2cl lemon juice' },
];

async function updatePremixSpecs() {
  try {
    console.log('Updating cocktail_premix_spec table with complete data...');
    let updated = 0;
    let inserted = 0;
    let failed = 0;

    for (const data of premixData) {
      // Find cocktail by name
      const cocktailResult = await sql`
        SELECT "cocktailId" as cocktail_id FROM cocktails 
        WHERE name = ${data.name}
        LIMIT 1
      `;

      if (cocktailResult.length === 0) {
        console.log(`✗ Cocktail not found: ${data.name}`);
        failed++;
        continue;
      }

      const cocktailId = cocktailResult[0].cocktail_id;

      // Check if spec exists
      const existing = await sql`
        SELECT id FROM cocktail_premix_spec 
        WHERE cocktail_id = ${cocktailId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        // Update existing
        await sql`
          UPDATE cocktail_premix_spec 
          SET premix_note = ${data.premixNote}, updated_at = NOW()
          WHERE cocktail_id = ${cocktailId}
        `;
        console.log(`✓ Updated: ${data.name}`);
        updated++;
      } else {
        // Insert new
        await sql`
          INSERT INTO cocktail_premix_spec (cocktail_id, premix_note)
          VALUES (${cocktailId}, ${data.premixNote})
        `;
        console.log(`✓ Inserted: ${data.name}`);
        inserted++;
      }
    }

    console.log(`\n✓ Complete! Updated: ${updated}, Inserted: ${inserted}, Failed: ${failed}`);
  } catch (error) {
    console.error('Error updating premix specs:', error);
    process.exit(1);
  }
}

updatePremixSpecs();
