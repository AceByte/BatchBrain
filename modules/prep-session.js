/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/prep-session.js
   Prep Session: Batch production & shopping list
   ══════════════════════════════════════════════ */

const PrepSessionModule = {
  open() {
    // Find all batched cocktails below threshold
    const batched = (BB.state.inventory || [])
      .map(item => {
        const cocktail = BB.state.cocktails.find(c => c.id === item.cocktailId);
        if (!cocktail?.isBatched) return null;
        const threshold = item.threshold ?? BB.state.config.defaultThreshold ?? 2;
        const count = item.count || 0;
        const batchRecipe = cocktail.batchRecipe || [];
        const batchSize = batchRecipe.reduce((sum, row) => sum + (row.parts || 0), 0);
        if (batchSize === 0) return null;
        // Calculate minimum batches needed to go just over threshold
        let batchesNeeded = 0;
        while (count + (batchesNeeded * batchSize) <= threshold) {
          batchesNeeded++;
          // Safety: don't prep more than 10 at once
          if (batchesNeeded > 10) break;
        }
        if (batchesNeeded === 0) return null;
        return {
          cocktail,
          item,
          batchesNeeded,
          batchRecipe
        };
      })
      .filter(Boolean);

    if (batched.length === 0) {
      BB_toast("All batched cocktails are above threshold!", "success");
      return;
    }

    // Calculate shopping list
    const shopping = {};
    batched.forEach(({ cocktail, batchesNeeded, batchRecipe }) => {
      batchRecipe.forEach(row => {
        if (!row.ingredient || !row.parts) return;
        if (!shopping[row.ingredient]) shopping[row.ingredient] = { total: 0, uses: [] };
        shopping[row.ingredient].total += row.parts * batchesNeeded;
        shopping[row.ingredient].uses.push(`${cocktail.name} (${row.parts} × ${batchesNeeded})`);
      });
    });

    // Build modal HTML
    let html = `<h2>🧾 New Prep Session</h2>
      <h3>Batches to Prep</h3>
      <ul>
        ${batched.map(b => `<li><b>${b.cocktail.name}</b>: Prep <b>${b.batchesNeeded}</b> batch${b.batchesNeeded > 1 ? 'es' : ''} <br>
        <span style="font-size:0.9em;color:#888;">${b.batchRecipe.map(r => `${r.ingredient}: ${r.parts} bottles`).join(', ')}</span>
        </li>`).join('')}
      </ul>
      <h3>Shopping List</h3>
      <ul>
        ${Object.entries(shopping).map(([ing, data]) =>
          `<li><b>${ing}</b>: ${data.total} bottles <span style="color:#888;">(${data.uses.join(', ')})</span></li>`
        ).join('')}
      </ul>
      <div style="margin-top:16px; display:flex; gap:12px;">
        <button class="btn btn-secondary" onclick="PrepSessionModule.exportShoppingList()">Export Shopping List</button>
        <button class="btn btn-primary" onclick="BB_closeModal()">Close</button>
      </div>
    `;

    BB_openModal(html, "600px");
  },

  exportShoppingList() {
    // Use the same batching logic as above
    const batched = (BB.state.inventory || [])
      .map(item => {
        const cocktail = BB.state.cocktails.find(c => c.id === item.cocktailId);
        if (!cocktail?.isBatched) return null;
        const threshold = item.threshold ?? BB.state.config.defaultThreshold ?? 2;
        const count = item.count || 0;
        const batchRecipe = cocktail.batchRecipe || [];
        const batchSize = batchRecipe.reduce((sum, row) => sum + (row.parts || 0), 0);
        if (batchSize === 0) return null;
        let batchesNeeded = 0;
        while (count + (batchesNeeded * batchSize) <= threshold) {
          batchesNeeded++;
          if (batchesNeeded > 10) break;
        }
        if (batchesNeeded === 0) return null;
        return {
          cocktail,
          item,
          batchesNeeded,
          batchRecipe
        };
      })
      .filter(Boolean);

    const shopping = {};
    batched.forEach(({ cocktail, batchesNeeded, batchRecipe }) => {
      batchRecipe.forEach(row => {
        if (!row.ingredient || !row.parts) return;
        if (!shopping[row.ingredient]) shopping[row.ingredient] = { total: 0, uses: [] };
        shopping[row.ingredient].total += row.parts * batchesNeeded;
        shopping[row.ingredient].uses.push(`${cocktail.name} (${row.parts} × ${batchesNeeded})`);
      });
    });

    let csv = "Ingredient,Total Bottles,Used In\n";
    Object.entries(shopping).forEach(([ing, data]) => {
      csv += `"${ing}",${data.total},"${data.uses.join('; ')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prep-shopping-list-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    BB_toast("Shopping list exported!", "success");
  }
};

window.PrepSessionModule = PrepSessionModule;