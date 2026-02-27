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

    // Build modal HTML with better styling
    const totalBottles = Object.values(shopping).reduce((sum, s) => sum + s.total, 0);

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <h2 style="margin:0;">🧾 New Prep Session</h2>
        <span class="badge badge-accent">${batched.length} cocktails</span>
      </div>

      <div class="prep-section" style="background:var(--bg-surface); border-radius:var(--radius-md); padding:20px; margin-bottom:24px;">
        <h3 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px; letter-spacing:1px;">Batches to Prep</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${batched.map(b => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-card); border-radius:var(--radius-sm); border:1px solid var(--border);">
              <div>
                <div style="font-weight:600; color:var(--text-primary);">${b.cocktail.name}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${b.batchRecipe.map(r => `${r.ingredient}: ${r.parts}`).join(' • ')}</div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:1.5rem; font-weight:700; color:var(--accent); font-family:var(--font-mono);">${b.batchesNeeded}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block;">batch${b.batchesNeeded > 1 ? 'es' : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="shopping-section" style="background:var(--bg-surface); border-radius:var(--radius-md); padding:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="font-size:0.85rem; text-transform:uppercase; color:var(--text-muted); margin:0; letter-spacing:1px;">Shopping List</h3>
          <span class="badge badge-success">${totalBottles} bottles total</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${Object.entries(shopping).map(([ing, data]) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-card); border-radius:var(--radius-sm);">
              <span style="color:var(--text-secondary);">${ing}</span>
              <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:0.75rem; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${data.uses.join(', ')}</span>
                <span style="font-weight:700; color:var(--accent); font-family:var(--font-mono); min-width:60px; text-align:right;">${data.total} bottles</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="PrepSessionModule.printPrepSession()">🖨️ Print</button>
        <button class="btn btn-secondary" onclick="PrepSessionModule.exportShoppingList()">📥 Export CSV</button>
        <button class="btn btn-primary" onclick="PrepSessionModule.applyAllPrep()" style="margin-left:auto;">Apply All to Inventory</button>
        <button class="btn btn-ghost" onclick="BB_closeModal()">Close</button>
      </div>

      <!-- Save and Discard buttons to the bottom-right corner -->
      <div style="position:fixed; bottom:20px; right:20px; display:flex; gap:10px;">
        <button class="btn btn-primary" onclick="PrepSessionModule.applyAllPrep()">Save</button>
        <button class="btn btn-ghost" onclick="BB_closeModal()">Discard</button>
      </div>
    `;

    BB_openModal(html, "600px");
  },

  printPrepSession() {
    const printWindow = window.open('', '_blank');
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
        return { cocktail, item, batchesNeeded, batchRecipe };
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

    const totalBottles = Object.values(shopping).reduce((sum, s) => sum + s.total, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Prep Session - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            h1 { font-size: 1.8rem; margin-bottom: 8px; }
            .date { color: #666; margin-bottom: 30px; }
            h2 { font-size: 1.2rem; margin-top: 30px; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
            .batch-item { display: flex; justify-content: space-between; padding: 12px; border: 1px solid #eee; margin-bottom: 8px; border-radius: 6px; }
            .batch-name { font-weight: 600; }
            .batch-recipe { font-size: 0.85rem; color: #666; margin-top: 4px; }
            .batch-count { font-size: 1.5rem; font-weight: 700; color: #d4b47c; }
            .shopping-item { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #eee; }
            .shopping-total { font-weight: 700; font-family: monospace; }
            .total-row { background: #f9f9f9; font-weight: 600; margin-top: 10px; padding: 12px; border-radius: 6px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>🧾 Prep Session</h1>
          <div class="date">${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>

          <h2>Batches to Prep (${batched.length} cocktails)</h2>
          ${batched.map(b => `
            <div class="batch-item">
              <div>
                <div class="batch-name">${b.cocktail.name}</div>
                <div class="batch-recipe">${b.batchRecipe.map(r => `${r.ingredient}: ${r.parts}`).join(' • ')}</div>
              </div>
              <div class="batch-count">${b.batchesNeeded}</div>
            </div>
          `).join('')}

          <h2>Shopping List (${totalBottles} bottles total)</h2>
          ${Object.entries(shopping).map(([ing, data]) => `
            <div class="shopping-item">
              <span>${ing}</span>
              <span class="shopping-total">${data.total} bottles</span>
            </div>
          `).join('')}

          <div class="total-row">
            <div style="display:flex; justify-content:space-between;">
              <span>Total Bottles Needed:</span>
              <span class="shopping-total">${totalBottles}</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  },

  applyAllPrep() {
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
        return { cocktail, item, batchesNeeded, batchSize };
      })
      .filter(Boolean);

    if (batched.length === 0) return;

    // Stage all prep changes
    batched.forEach(({ item, batchesNeeded, batchSize }) => {
      const toAdd = batchesNeeded * batchSize;
      if (toAdd > 0) {
        InventoryModule._stagedCounts[item.cocktailId] = (InventoryModule._stagedCounts[item.cocktailId] || item.count) + toAdd;
        InventoryModule._hasUnsavedChanges = true;
      }
    });

    BB_closeModal();
    BB.renderAll();
    InventoryModule.renderStagingControls();
    BB_toast(`Staged prep for ${batched.length} cocktails. Click Save to apply.`, 'success');
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