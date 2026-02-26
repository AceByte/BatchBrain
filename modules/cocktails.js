/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/cocktails.js (SIMPLIFIED)
   Cocktails = source of truth
   ══════════════════════════════════════════════ */

const CocktailsModule = {

  _editId: null,
  _filterTag: "all",

  GLASSWARE: [
    "Coupe", "Nick & Nora", "Highball", "LowBall/Rocks", "Shot", "Wine", "Water", "Double Cortado", "Cortado", "Other"
  ],

  TECHNIQUES: [
    "Shake", "Stir", "Build",
    "Build & Churn", "Throw",
    "Roll", "Muddle"
  ],

  MENU_TAGS: ["Regular", "Seasonal", "Signature"],
  STRAINING: ["None", "Strain", "Double Strain", "Dirty Pour"],

  /* ═══════════════════════════════════════
     FORM
  ═══════════════════════════════════════ */

  /* ═══════════════════════════════════════
     FORM
  ═══════════════════════════════════════ */

  /* ═══════════════════════════════════════
     FORM
  ═══════════════════════════════════════ */

  openForm(id = null) {
    this._editId = id;
    const c = id ? BB.state.cocktails.find(x => x.id === id) : null;
    const invItem = id ? BB.state.inventory.find(i => i.cocktailId === id) : null;

    BB_openModal(`
      <div class="improved-form" style="display:flex; flex-direction:column; gap:8px;">
        <h2 style="margin-bottom:16px;">${id ? "Edit Cocktail" : "New Cocktail"}</h2>

        <!-- SECTION: IDENTITY -->
        <div class="form-section">
          <div class="form-section-title"><span>🆔</span> Identity & Category</div>
          <div class="form-row">
            <label>Name</label>
            <input id="ck-name" placeholder="E.g. Spicy Pisco Sour" value="${c?.name || ""}">
          </div>
          <div class="form-grid">
            <div class="form-row">
              <label>Menu Category</label>
              <select id="ck-tag">
                ${this.MENU_TAGS.map(t => `<option value="${t}" ${c?.tag === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <label>Glassware</label>
              <select id="ck-glass">
                <option value="">Select Glass</option>
                ${this.GLASSWARE.map(g => `<option value="${g}" ${c?.glassware === g ? "selected" : ""}>${g}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- SECTION: SERVICE SPEC -->
        <div class="form-section">
          <div class="form-section-title"><span>🍸</span> Service Specification</div>
          <div class="form-grid">
            <div class="form-row">
              <label>Technique</label>
              <select id="ck-tech">
                <option value="">Select Tech</option>
                ${this.TECHNIQUES.map(t => `<option value="${t}" ${c?.technique === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <label>Straining</label>
              <select id="ck-straining">
                ${this.STRAINING.map(s => `<option value="${s}" ${c?.straining === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
            <div class="form-row">
              <label>Garnish</label>
              <input id="ck-garnish" placeholder="E.g. Lime wheel, salt rim" value="${c?.garnish || ""}">
            </div>
            <div class="form-row">
              <label>Serve Extras / Toppers</label>
              <input id="ck-extras" placeholder="E.g. Top Soda, side of Prosecco" value="${c?.serveExtras || ""}">
            </div>
          </div>
        </div>

        <!-- SECTION: ML BUILD (FOR SPEC SHEET) -->
        <div class="form-section">
          <div class="form-section-title"><span>⚖️</span> Service Build (ML)</div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Define the exact recipe ml for the spec sheet.</p>
          <div id="spec-list-managed">
            ${(c?.spec || []).map(r => this._getRowHtml('spec', r.ingredient, r.ml)).join("")}
            ${(!c?.spec || c.spec.length === 0) ? this._getRowHtml('spec') : ""}
          </div>
          <button class="btn btn-sm btn-ghost" onclick="CocktailsModule.addRow('spec')" style="margin-top:8px;">+ Add Ingredient</button>

          <div class="spec-total-bar">
            <span style="font-size:0.85rem; font-weight:600;">Full Build Volume:</span>
            <span class="total-ml-value" id="spec-total-ml">0 ml</span>
          </div>
        </div>

        <!-- SECTION: BATCHING & INVENTORY -->
        <div class="form-section">
          <div class="form-section-title"><span>📦</span> Production & Inventory</div>

          <div class="batch-build-toggle-wrap">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-weight:600; font-size:0.9rem;">Track in Inventory</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">Enable to monitor stock levels and prep needs.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="ck-batched" ${c?.isBatched ? "checked" : ""} onchange="CocktailsModule.toggleBatchSections(this.checked)">
              <span class="slider"></span>
            </label>
          </div>

          <div id="batch-options-area" style="display: ${c?.isBatched ? "block" : "none"}">
            <div class="form-row">
              <label>Low Stock Threshold (Bottles)</label>
              <input type="number" id="ck-threshold" value="${invItem?.threshold || 2}" step="0.5">
            </div>

            <div class="sep" style="margin:20px 0;"></div>

            <div class="form-section-title" style="color:var(--accent-2);"><span>⚗️</span> Batch Ratio (Parts)</div>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">Define the ratio for large-scale production (e.g. for 5L batches).</p>
            <div id="parts-list-managed">
              ${(c?.batchRecipe || []).map(r => this._getRowHtml('parts', r.ingredient, r.parts)).join("")}
              ${(!c?.batchRecipe || c.batchRecipe.length === 0) ? this._getRowHtml('parts') : ""}
            </div>
            <button class="btn btn-sm btn-ghost" onclick="CocktailsModule.addRow('parts')" style="margin-top:8px;">+ Add Part</button>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="BB_closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="CocktailsModule.saveForm()">Save Cocktail</button>
        </div>
      </div>
    `, "720px");

    this._updateTotalML();
    this._attachLiveListeners();
    this.setupIngredientTypeaheads();
  },

  _getRowHtml(type, ing = "", val = "") {
    const isSpec = type === 'spec';
    return `
      <div class="${isSpec ? 'spec-row-managed' : 'parts-row-managed'}" data-type="${type}">
        <input placeholder="Ingredient" class="row-ingredient" value="${ing}">
        <input type="number" placeholder="${isSpec ? 'ml' : 'parts'}" class="row-val" value="${val}" step="0.1">
        <button class="btn btn-icon btn-danger" onclick="this.parentElement.remove(); CocktailsModule._updateTotalML();" style="padding:6px;">✕</button>
      </div>
    `;
  },

  addRow(type) {
    const containerId = type === 'spec' ? "spec-list-managed" : "parts-list-managed";
    const container = document.getElementById(containerId);
    if (container) {
      container.insertAdjacentHTML('beforeend', this._getRowHtml(type));
      this._attachLiveListeners();
      this.setupIngredientTypeaheads();
    }
  },

  toggleBatchSections(show) {
    const area = document.getElementById("batch-options-area");
    if (area) area.style.display = show ? "block" : "none";
  },

  _attachLiveListeners() {
    document.querySelectorAll('.row-val').forEach(input => {
      input.oninput = () => this._updateTotalML();
    });
  },

  _updateTotalML() {
    const total = [...document.querySelectorAll('#spec-list-managed .row-val')]
      .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    const display = document.getElementById('spec-total-ml');
    if (display) display.innerText = `${total.toFixed(1).replace('.0', '')} ml`;
  },

  /* ═══════════════════════════════════════
     SAVE
  ═══════════════════════════════════════ */

  saveForm() {
    const name = document.getElementById("ck-name").value.trim();
    if (!name) return BB_toast("Please enter a cocktail name", "error");

    const spec = [...document.querySelectorAll("#spec-list-managed .spec-row-managed")]
      .map(row => ({
        ingredient: row.querySelector(".row-ingredient").value.trim(),
        ml: parseFloat(row.querySelector(".row-val").value) || 0
      }))
      .filter(r => r.ingredient);

    const isBatched = document.getElementById("ck-batched").checked;
    const garnish = document.getElementById("ck-garnish").value.trim();

    const batchRecipe = isBatched ? [...document.querySelectorAll("#parts-list-managed .parts-row-managed")]
      .map(row => ({
        ingredient: row.querySelector(".row-ingredient").value.trim(),
        parts: parseFloat(row.querySelector(".row-val").value) || 0
      }))
      .filter(r => r.ingredient) : [];

    const payload = {
      id: this._editId || BB.uid(),
      name,
      tag: document.getElementById("ck-tag").value,
      glassware: document.getElementById("ck-glass").value,
      technique: document.getElementById("ck-tech").value,
      straining: document.getElementById("ck-straining").value,
      isBatched,
      garnish,
      serveExtras: document.getElementById("ck-extras").value.trim(),
      spec,
      batchRecipe
    };

    if (this._editId) {
      BB.dispatch({ type: "UPDATE_COCKTAIL", payload });
    } else {
      BB.dispatch({ type: "ADD_COCKTAIL", payload });
    }

    // Handle threshold specifically if batched
    if (isBatched) {
      const threshold = parseFloat(document.getElementById("ck-threshold").value) || 2;
      const invItem = BB.state.inventory.find(i => i.cocktailId === payload.id);
      if (invItem) invItem.threshold = threshold;
    }

    BB_closeModal();
    BB.renderAll();
  },

  /* ═══════════════════════════════════════
     DELETE
  ═══════════════════════════════════════ */

deleteById(id) {
  if (!confirm("Delete this cocktail?")) return;

  BB.dispatch({
    type: "DELETE_COCKTAIL",
    payload: { id }
  });

  this.render(document.getElementById("app-root"));
},

/* ═══════════════════════════════════════
   INGREDIENT TYPEAHEAD / AUTOCOMPLETE
═══════════════════════════════════════ */

// Get all unique ingredients from existing cocktails
getAllIngredients() {
    const ingredients = new Set();
    BB.state.cocktails.forEach(c => {
      (c.spec || []).forEach(s => {
        if (s.ingredient) ingredients.add(s.ingredient);
      });
      (c.batchRecipe || []).forEach(r => {
        if (r.ingredient) ingredients.add(r.ingredient);
      });
    });
    return Array.from(ingredients).sort();
  },

  // Setup typeahead for an input element
  setupTypeahead(inputElement, suggestions) {
    if (!inputElement) return;

    // Remove existing typeahead container
    const existing = inputElement.parentElement.querySelector('.typeahead-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.className = 'typeahead-container';
    container.style.cssText = 'position:absolute; top:100%; left:0; right:0; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); max-height:200px; overflow-y:auto; z-index:1000; display:none; box-shadow:var(--shadow-card);';

    inputElement.parentElement.style.position = 'relative';
    inputElement.parentElement.appendChild(container);

    inputElement.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();
      if (value.length < 1) {
        container.style.display = 'none';
        return;
      }

      const matches = suggestions.filter(s => s.toLowerCase().includes(value));
      if (matches.length === 0) {
        container.style.display = 'none';
        return;
      }

      container.innerHTML = matches.slice(0, 8).map(match => `
        <div class="typeahead-item" style="padding:10px 14px; cursor:pointer; font-size:0.9rem; color:var(--text-secondary); border-bottom:1px solid var(--border); transition:all 0.2s;"
             onmouseover="this.style.background='var(--accent-soft)'; this.style.color='var(--accent)';"
             onmouseout="this.style.background='transparent'; this.style.color='var(--text-secondary)';"
             onclick="this.closest('.typeahead-container').previousElementSibling.value='${match.replace(/'/g, "\'")}'; this.closest('.typeahead-container').style.display='none'; CocktailsModule._updateTotalML();">
          ${match}
        </div>
      `).join('');

      container.style.display = 'block';
    });

    // Hide on blur (with delay to allow click)
    inputElement.addEventListener('blur', () => {
      setTimeout(() => {
        container.style.display = 'none';
      }, 200);
    });

    // Show on focus if has value
    inputElement.addEventListener('focus', () => {
      if (inputElement.value.length >= 1) {
        inputElement.dispatchEvent(new Event('input'));
      }
    });

    // Keyboard navigation
    inputElement.addEventListener('keydown', (e) => {
      const items = container.querySelectorAll('.typeahead-item');
      const active = container.querySelector('.typeahead-item.active');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!active) {
          items[0]?.classList.add('active');
          items[0].style.background = 'var(--accent-soft)';
          items[0].style.color = 'var(--accent)';
        } else {
          const next = active.nextElementSibling;
          if (next) {
            active.classList.remove('active');
            active.style.background = 'transparent';
            active.style.color = 'var(--text-secondary)';
            next.classList.add('active');
            next.style.background = 'var(--accent-soft)';
            next.style.color = 'var(--accent)';
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) {
          const prev = active.previousElementSibling;
          if (prev) {
            active.classList.remove('active');
            active.style.background = 'transparent';
            active.style.color = 'var(--text-secondary)';
            prev.classList.add('active');
            prev.style.background = 'var(--accent-soft)';
            prev.style.color = 'var(--accent)';
          }
        }
      } else if (e.key === 'Enter' && active) {
        e.preventDefault();
        inputElement.value = active.textContent.trim();
        container.style.display = 'none';
        this._updateTotalML();
      } else if (e.key === 'Escape') {
        container.style.display = 'none';
      }
    });
  },

  // Call this after rendering the form to setup typeaheads
  setupIngredientTypeaheads() {
    const ingredients = this.getAllIngredients();

    // Setup for spec rows
    document.querySelectorAll('#spec-list-managed .row-ingredient').forEach(input => {
      this.setupTypeahead(input, ingredients);
    });

    // Setup for parts rows
    document.querySelectorAll('#parts-list-managed .row-ingredient').forEach(input => {
      this.setupTypeahead(input, ingredients);
    });
  }
};

window.CocktailsModule = CocktailsModule;