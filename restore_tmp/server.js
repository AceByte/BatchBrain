require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { neon } = require("@neondatabase/serverless");

const app = express();
const PORT = 3000;
const sql = neon(process.env.DATABASE_URL);

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Serve static files for the frontend
app.use(express.static(__dirname));
app.use('/barbrain', express.static(__dirname));

// GET data from DB
app.get('/api/data', async (req, res) => {
    try {
        const [cocktails, specs, batchRecipes, inventoryRows, prepLogs, configRows] = await Promise.all([
            sql`SELECT * FROM cocktails`,
            sql`SELECT * FROM cocktail_specs`,
            sql`SELECT * FROM batch_recipes`,
            sql`SELECT * FROM inventory`,
            sql`SELECT * FROM prep_logs`,
            sql`SELECT * FROM config`
        ]);

        // Compose cocktails with their specs and batch recipes
        const cocktailsWithSpecs = cocktails.map(cocktail => ({
            ...cocktail,
            spec: specs.filter(s => s.cocktail_id === cocktail.cocktailId).map(s => ({ ingredient: s.ingredient, ml: s.ml })),
            batchRecipe: batchRecipes.filter(b => b.cocktail_id === cocktail.cocktailId).map(b => ({ ingredient: b.ingredient, parts: b.parts }))
        }));

        // Compose config as key-value pairs
        const configObj = {};
        configRows.forEach(row => { configObj[row.key] = row.value; });

        // Compose inventory with threshold
        const inventory = inventoryRows.map(row => ({
            cocktailId: row.cocktailId,
            name: row.name,
            count: row.count,
            threshold: row.threshold || configObj.defaultThreshold || 2
        }));

        res.json({
            version: 2,
            cocktails: cocktailsWithSpecs,
            inventory,
            prepLogs,
            config: configObj
        });
    } catch (err) {
        console.error('DB error:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// POST data to DB
app.post('/api/data', async (req, res) => {
    const { state } = req.body;
    if (!state) return res.status(400).json({ error: "Missing state" });

    const { cocktails, inventory, prepLogs, config } = state;
    try {
        await sql`DELETE FROM cocktail_specs`;
        await sql`DELETE FROM batch_recipes`;
        await sql`DELETE FROM cocktails`;
        await sql`DELETE FROM inventory`;
        await sql`DELETE FROM prep_logs`;
        await sql`DELETE FROM config`;

        // Insert cocktails and their specs/batch recipes
        for (const c of cocktails) {
            await sql`
                INSERT INTO cocktails (cocktailId, name, tag, glassware, technique, straining, garnish, is_batched, serve_extras)
                VALUES (${c.cocktailId}, ${c.name}, ${c.tag}, ${c.glassware}, ${c.technique}, ${c.straining}, ${c.garnish}, ${c.is_batched}, ${c.serve_extras})
            `;
            for (const s of c.spec || []) {
                await sql`
                    INSERT INTO cocktail_specs (cocktail_id, ingredient, ml)
                    VALUES (${c.cocktailId}, ${s.ingredient}, ${s.ml})
                `;
            }
            for (const b of c.batchRecipe || []) {
                await sql`
                    INSERT INTO batch_recipes (cocktail_id, ingredient, parts)
                    VALUES (${c.cocktailId}, ${b.ingredient}, ${b.parts})
                `;
            }
        }

        // Insert inventory
        for (const i of inventory) {
            await sql`
                INSERT INTO inventory (cocktailId, name, count)
                VALUES (${i.cocktailId}, ${i.name}, ${i.count})
            `;
        }

        // Insert prep logs
        for (const l of prepLogs) {
            await sql`
                INSERT INTO prep_logs (date, cocktail_id, amount)
                VALUES (${l.date}, ${l.cocktail_id}, ${l.amount})
            `;
        }

        // Insert config
        for (const key in config) {
            await sql`
                INSERT INTO config (key, value)
                VALUES (${key}, ${config[key]})
            `;
        }

        res.json({ success: true });
    } catch (err) {
        console.error('DB error:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.listen(PORT, () => {
    console.log(`Batchbrain Data Server running on http://localhost:${PORT}`);
});