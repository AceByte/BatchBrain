/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/specsheet.js (SIMPLIFIED)
   Spec sheet derived from cocktails
   ══════════════════════════════════════════════ */

const SpecSheetModule = {

  PERISHABLE_KEYWORDS: [
    "lemon", "lime", "juice", "egg",
    "cream", "mint", "basil", "fruit", "cucumber"
  ],

  _filterTag: "all",

  isPerishable(name = "") {
    const n = name.toLowerCase();
    return this.PERISHABLE_KEYWORDS.some(k => n.includes(k));
  },

  render(root) {
    const cocktails = BB.state.cocktails;

    root.innerHTML = `
      <div class="page-header" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">
            <span class="page-icon">📋</span> Spec Sheet & Recipes
          </h1>
          <p class="page-subtitle">
            Manage your cocktails and view prep specifications.
          </p>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" onclick="SpecSheetModule.openPrepSheet()">🧾 Prep Sheet</button>
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Print Menu</button>
          <button class="btn btn-ghost" onclick="BB.promptImport()" title="Import data from JSON file">📥 Import</button>
          <button class="btn btn-ghost" onclick="BB.exportData()" title="Export data to JSON file">📤 Export</button>
          <button class="btn btn-primary" onclick="CocktailsModule.openForm()">+ Add Cocktail</button>
        </div>
      </div>

      <div class="tabs" style="margin-bottom:24px;">
        ${["all", "Regular", "Seasonal", "Signature"].map(t => `
          <button class="tab-btn ${filter === t ? "active" : ""}"
            onclick="SpecSheetModule.setFilter('${t}')">
            ${t === "all" ? "All Recipes" : t}
          </button>
        `).join("")}
      </div>

      <div id="recipe-list" class="grid-auto">
        ${filteredList.length === 0
        ? `<div class="empty-state" style="grid-column:1/-1"><div class="es-text">No cocktails found in this category.</div></div>`
        : filteredList.map((c, idx) => this.renderRecipeCard(c, idx)).join("")}
      </div>
    `;
  },

  setFilter(tag) {
    this._filterTag = tag;
    BB.renderAll();
  },

  renderRecipeCard(c, index) {
    const spec = c.spec || [];
    const total = spec.reduce((s, r) => s + (r.ml || 0), 0);

    return `
      <div class="card recipe-card animate-slide-up" style="animation-delay: ${index * 0.05}s" id="recipe-${c.id}">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
          <div>
            <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:6px; letter-spacing:-0.4px; color:var(--text-primary);">${c.name}</h3>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
               ${c.glassware ? `<span class="badge badge-accent" style="font-size:0.7rem;">🥂 ${c.glassware}</span>` : ""}
               ${c.technique ? `<span class="badge badge-blue" style="font-size:0.7rem;">🔄 ${c.technique}</span>` : ""}
               ${c.straining && c.straining !== "None" ? `<span class="badge badge-pink" style="font-size:0.7rem;">🏺 ${c.straining}</span>` : ""}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm btn-ghost" onclick="CocktailsModule.openForm('${c.id}')" style="padding:8px; border-radius:50%; width:36px; height:36px;">✏️</button>
            <button class="btn btn-sm btn-ghost" onclick="CocktailsModule.deleteById('${c.id}')" style="padding:8px; border-radius:50%; width:36px; height:36px;">🗑️</button>
          </div>
        </div>

        ${c.garnish ? `
          <div class="recipe-meta-box" style="margin-bottom:20px; padding:12px 16px; background:rgba(212, 180, 124, 0.05); border-radius:var(--radius-md); border-left:4px solid var(--accent);">
            <div style="font-size:0.7rem; color:var(--accent); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Garnish</div>
            <div style="font-size:0.95rem; color:var(--text-primary); font-weight:500;">${c.garnish}</div>
          </div>
        ` : ""}

        ${c.serveExtras ? `
          <div class="recipe-meta-box" style="margin-bottom:24px; padding:12px 16px; background:rgba(130, 185, 230, 0.05); border-radius:var(--radius-md); border-left:4px solid var(--accent-2);">
            <div style="font-size:0.7rem; color:var(--accent-2); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Serve Extras</div>
            <div style="font-size:0.95rem; color:var(--text-primary); font-weight:500;">${c.serveExtras}</div>
          </div>
        ` : ""}

        <div class="recipe-build">
          <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
             <h4 style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:1px;">Standard Build</h4>
             <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--accent); font-weight:700;">${total} ml total</span>
          </div>

          <div class="build-list" style="display:flex; flex-direction:column; gap:2px;">
            ${spec.map(r => `
              <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03); font-size:0.92rem;">
                <span style="color:var(--text-secondary); font-weight:500;">
                  ${r.ingredient}
                  ${this.isPerishable(r.ingredient) ? '<span title="Perishable" style="color:var(--warning); font-size:0.8rem; margin-left:4px;">⚠️</span>' : ""}
                </span>
                <span style="font-family:var(--font-mono); font-weight:700; color:var(--text-primary);">${r.ml}ml</span>
              </div>
            `).join("")}
          </div>
        </div>

        ${c.batchRecipe && c.batchRecipe.length > 0 ? `
          <div class="batch-section" style="margin-top:32px; padding-top:24px; border-top:1px dashed var(--border);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
               <span style="font-size:1rem;">⚗️</span>
               <h4 style="font-size:0.75rem; text-transform:uppercase; color:var(--accent); font-weight:700; letter-spacing:1px;">Batch Ratios</h4>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              ${c.batchRecipe.map(r => `
                <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px;">${r.ingredient}</span>
                  <span style="font-family:var(--font-mono); font-weight:800; color:var(--accent-2); font-size:0.9rem;">${r.parts}x</span>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  },

  openPrepSheet() {
    // Build a condensed printable page
    const cocktails = BB.state.cocktails.filter(c => c.isBatched);
    const html = `
      <html>
        <head>
          <title>Prep Sheet</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #111; padding:20px; }
            .card { border-bottom:1px solid #eee; padding:10px 0; display:flex; justify-content:space-between; }
            h2 { margin:0 0 6px 0; font-size:1rem; }
            .ingredients { font-size:0.9rem; color:#333; }
            @media print {
              body { color:#000; }
            }
          </style>
        </head>
        <body>
          <h1>Prep Sheet — ${new Date().toLocaleDateString()}</h1>
          ${cocktails.map(c => `
            <div class="card">
              <div style="flex:1;">
                <h2>${c.name}</h2>
                <div class="ingredients">${(c.spec || []).map(s => `${s.ingredient} — ${s.ml}ml`).join(' • ')}</div>
              </div>
              <div style="width:120px; text-align:right;">
                <div style="font-weight:700;">Prep Qty</div>
                <div style="margin-top:8px;">_____ bottles</div>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    // user prints from the new window
  },

  updateIngredientSuggestions() {
    const ingredientList = BB.state.inventory.map(i => i.name);
    const datalist = document.getElementById("ingredient-suggestions");
    if (datalist) {
      datalist.innerHTML = ingredientList.map(ing => `<option value="${ing}"></option>`).join("");
    }
  },

  

};

window.SpecSheetModule = SpecSheetModule;