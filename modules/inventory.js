/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/inventory.js (FIXED & IMPROVED)
   Inventory = batched cocktails only
   ══════════════════════════════════════════════ */

const InventoryModule = {

  // staging helpers for edit/save workflow
  _editMode: false,
  _stagedCounts: {},

  /* ═══════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════ */

  getCocktail(item) {
    return BB.state.cocktails.find(
      c => c.id === item.cocktailId
    );
  },

  calcDailyUsage(log = []) {
    if (log.length < 2) return 0;

    const sorted = [...log].sort((a, b) => a.ts - b.ts);

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const days =
      (last.ts - first.ts) / (1000 * 60 * 60 * 24);

    if (days <= 0) return 0;

    const diff = first.count - last.count;

    return diff > 0 ? diff / days : 0;
  },

  /* ═══════════════════════════════════════
     PAGE RENDER
  ═══════════════════════════════════════ */

  render(root) {

    const inventory = BB.state.inventory;

    const needsBatching =
      inventory.filter(i => i.count <= i.threshold);

    const healthy =
      inventory.filter(i => i.count > i.threshold);

    root.innerHTML = `
      <div class="page-header" id="inventory-header">
        <div>
          <h1 class="page-title">
            <span class="page-icon">🥃</span>
            Batched Cocktails
          </h1>
          <p class="page-subtitle">
            Real-time inventory for your house-made batches.
          </p>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          ${QuickCountModule ? QuickCountModule.renderButton() : ''}
        </div>
      </div>

      <div class="grid-3 animate-fade-in" style="margin-bottom:32px;">
        <div class="stat-pill">
          <span class="sp-label">🚨 Needs Prep</span>
          <span class="sp-value" style="color:var(--danger)">
            ${needsBatching.length}
          </span>
          <span class="sp-sub">Critical level</span>
        </div>

        <div class="stat-pill">
          <span class="sp-label">✅ Healthy</span>
          <span class="sp-value" style="color:var(--success)">
            ${healthy.length}
          </span>
          <span class="sp-sub">Stocked items</span>
        </div>

        <div class="stat-pill">
          <span class="sp-label">🥃 Total</span>
          <span class="sp-value">
            ${inventory.length}
          </span>
          <span class="sp-sub">Tracked batches</span>
        </div>
      </div>

      <div id="premix-list" class="grid-auto">
        ${inventory.length === 0
        ? `
          <div class="card" style="grid-column: 1 / -1">
            <div class="empty-state">
              <div class="es-icon">🍹</div>
              <div class="es-text">
                No batched cocktails yet
              </div>
              <div class="es-sub">
                Mark a cocktail as batched in the Cocktails section to track it here.
              </div>
            </div>
          </div>
          `
        : inventory.map((i, index) => this.renderCard(i, index)).join("")
      }
      </div>
    `;
  },

  /* ═══════════════════════════════════════
     CARD
  ═══════════════════════════════════════ */

  // when rendering each card, prefer staged value if present and show input in editMode
  renderCard(item, index, isUrgent = false) {
    const cocktail = this.getCocktail(item);
    const staged = this._stagedCounts[cocktail.id];
    const displayCount = (staged !== undefined) ? staged : item.count;

    const usage = this.calcDailyUsage(item.premixLog || []);
    let daysLeft = '∞';
    if (usage > 0) {
      daysLeft = (displayCount / usage).toFixed(1);
    }

    const cardClass = isUrgent ? 'inv-card urgent' : 'inv-card';

    return `
      <div class="card ${cardClass} animate-slide-up" style="animation-delay: ${index * 0.03}s;" data-cocktail-id="${cocktail.id}">
        ${isUrgent ? `
          <div class="urgent-glow"></div>
          <div class="urgent-tag">⚠️ URGENT PREP</div>
        ` : ''}

        <div class="inv-card-header" style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
            <div>
              <h3 style="font-size:1.2rem; font-weight:700; margin-bottom:4px; letter-spacing:-0.3px;">${cocktail.name}</h3>
              <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                ${cocktail.technique || "Mixed"} • ${cocktail.glassware || "Standard"}
              </div>
            </div>
            <div class="status-indicator ${isUrgent ? 'danger' : 'success'}"
                 style="width:12px; height:12px; border-radius:50%; background:var(--${isUrgent ? 'danger' : 'success'}); box-shadow:0 0 10px var(--${isUrgent ? 'danger' : 'success'});">
            </div>
          </div>
        </div>

        <div class="inv-card-main" style="display:flex; flex-direction:column; gap:20px;">
          <div class="count-controller" style="display:flex; align-items:center; justify-content:center; gap:24px; padding:16px; background:var(--bg-input); border-radius:var(--radius-md); border:1px solid var(--border);">
            <button class="btn-count"
               onclick="InventoryModule.adjustCount('${cocktail.id}',-1)"
               ${displayCount <= 0 ? 'disabled' : ''}
               style="width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border:1px solid var(--border); font-size:1.5rem; transition:all 0.2s;">
              −
            </button>

            <div style="display:flex; flex-direction:column; align-items:center;">
              ${this._editMode ? `
                <input type="number" id="inv-count-input-${cocktail.id}" value="${displayCount}" min="0" style="width:120px; text-align:center; font-size:2.4rem; font-family:var(--font-mono); font-weight:700;" oninput="InventoryModule.stageDirectInput('${cocktail.id}', this.value)">
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-top:6px;">Editing — bottles</div>
              ` : `
                <span class="count-value" style="font-size:2.8rem; font-weight:800; font-family:var(--font-mono); line-height:1; color:${isUrgent ? 'var(--danger)' : 'var(--text-primary)'}">
                  ${displayCount}
                </span>
                <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-top:4px;">Bottles</span>
              `}
            </div>

            <button class="btn-count"
               onclick="InventoryModule.adjustCount('${cocktail.id}',1)"
               style="width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border:1px solid var(--border); font-size:1.5rem; transition:all 0.2s;">
              +
            </button>
          </div>

          <div class="prediction-bar" style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:var(--radius-sm); font-size:0.85rem;">
            <span style="opacity:0.6;">⏳</span>
            <span style="color:var(--text-secondary); font-weight:500;">
              ${daysLeft !== '∞' ? `Est. <strong>${daysLeft} days</strong> remaining` : 'Waiting for usage data'}
            </span>
          </div>
        </div>

        <div class="inv-card-footer" style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="InventoryModule.showHistory('${cocktail.id}')">
             History
          </button>
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="InventoryModule.openPrepModal('${cocktail.id}')">
             Prep Calc
          </button>
        </div>
      </div>
      <style>
        .inv-card.urgent { border:1px solid var(--danger); box-shadow: 0 0 30px rgba(230, 117, 117, 0.1); }
        .urgent-tag { position:absolute; top:0; right:0; background:var(--danger); color:#fff; font-size:0.65rem; font-weight:800; padding:4px 10px; border-radius:0 0 0 10px; }
        .btn-count:hover:not(:disabled) { background:var(--accent-soft) !important; border-color:var(--accent-dark) !important; color:var(--accent) !important; }
        .btn-count:active { transform:scale(0.9); }
        .btn-count:disabled { opacity:0.2; cursor:not-allowed; }
      </style>
    `;
  },

  /* ═══════════════════════════════════════
     ACTIONS
  ═══════════════════════════════════════ */

  // toggle edit mode (show inputs, enable staging)
  toggleEditMode() {
    this._editMode = !this._editMode;
    if (!this._editMode) {
      // leaving edit mode without saving clears staged changes
      this._stagedCounts = {};
    }
    this.renderAll?.() || this.render?.(); // re-render inventory view (method name depends on file)
    this.renderStagingControls();
  },

  // Called from number inputs while editing
  stageDirectInput(cocktailId, raw) {
    const v = parseInt(raw) || 0;
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;
    const clamped = Math.max(0, v);
    this._stagedCounts[cocktailId] = clamped;
    this.renderCardUpdate?.(cocktailId);
    this.renderStagingControls();
  },

  // When in edit mode, +/- adjust will stage instead of dispatching
  adjustCount(cocktailId, delta) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;

    if (this._editMode) {
      const base = (this._stagedCounts[cocktailId] !== undefined) ? this._stagedCounts[cocktailId] : item.count;
      const next = Math.max(0, base + delta);
      this._stagedCounts[cocktailId] = next;
      // update only the card UI for responsiveness
      if (this.renderCardUpdate) this.renderCardUpdate(cocktailId);
      this.renderStagingControls();
      return;
    }

    // Original immediate behavior
    if (item.count + delta < 0) return;

    BB.dispatch({
      type: "UPDATE_COUNT",
      payload: {
        id: cocktailId,
        delta
      }
    });

    // Re-render only the specific card for better performance
    this.renderCardUpdate(cocktailId);

    // Update low stock banner
    BB.checkLowStock();
  },

  // apply all staged changes in one operation (one save)
  saveStagedChanges() {
    const stagedKeys = Object.keys(this._stagedCounts);
    if (stagedKeys.length === 0) {
      BB_toast('No changes to save', 'info');
      return;
    }

    let lastLog = null;

    // Apply directly to state and create grouped logs, then call BB.save once
    stagedKeys.forEach(id => {
      const newCount = this._stagedCounts[id];
      const item = BB.state.inventory.find(i => i.cocktailId === id);
      if (!item) return;
      const prev = item.count;
      const delta = newCount - prev;
      if (delta === 0) return;

      item.count = newCount;
      // create a grouped log entry (BB._addLogWithGrouping exists on BB)
      if (BB._addLogWithGrouping) {
        lastLog = BB._addLogWithGrouping(item, delta, 'batch-edit') || lastLog;
      }
    });

    // save once for the whole batch
    BB.save(lastLog || null);

    // clear staging and exit edit mode
    this._stagedCounts = {};
    this._editMode = false;

    // re-render inventory and update low-stock banner
    if (this.renderAll) this.renderAll();
    else if (this.render) this.render();

    BB.checkLowStock();
    BB_toast('Changes saved', 'success');
    this.renderStagingControls();
  },

  // discard staged changes
  discardStagedChanges() {
    this._stagedCounts = {};
    this._editMode = false;
    if (this.renderAll) this.renderAll();
    else if (this.render) this.render();
    BB_toast('Changes discarded', 'info');
    this.renderStagingControls();
  },

  // small control bar for Save/Discard while editing
  renderStagingControls() {
    // place the bar inside app-root so it only appears within app context
    const root = document.getElementById('app-root') || document.body;
    let bar = document.getElementById('inventory-staging-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'inventory-staging-bar';
      bar.style.cssText = 'position:sticky; top:8px; z-index:40; display:flex; gap:8px; justify-content:flex-end; margin-bottom:12px;';
      root.insertBefore(bar, root.firstChild);
    }

    // show a toggle even when not in inventory (safe no-op)
    bar.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn-ghost" id="btn-toggle-edit">${this._editMode ? 'Exit edit' : 'Edit counts'}</button>
        ${this._editMode ? '<button class="btn btn-secondary" id="btn-discard">Discard changes</button><button class="btn btn-primary" id="btn-save">Save changes</button>' : ''}
      </div>
    `;

    // attach handlers
    const btnToggle = document.getElementById('btn-toggle-edit');
    if (btnToggle) btnToggle.onclick = () => this.toggleEditMode();

    const btnSave = document.getElementById('btn-save');
    if (btnSave) btnSave.onclick = () => this.saveStagedChanges();

    const btnDiscard = document.getElementById('btn-discard');
    if (btnDiscard) btnDiscard.onclick = () => {
      if (confirm('Discard staged changes?')) this.discardStagedChanges();
    };
  },

  // When a single card updates (after staging) update its DOM quickly
  renderCardUpdate(cocktailId) {
    const el = document.getElementById(`inv-card-${cocktailId}`);
    if (!el) return;
    // Re-render the single card by replacing outerHTML using renderCard
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;
    const idx = BB.state.inventory.indexOf(item);
    const html = this.renderCard(item, idx, item.count <= (item.threshold || BB.state.config.defaultThreshold));
    el.outerHTML = html;
  },

  /* ═══════════════════════════════════════
     HISTORY MODAL
  ═══════════════════════════════════════ */

  showHistory(cocktailId) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    const cocktail = this.getCocktail(item);
    if (!item || !cocktail) return;

    const logs = (item.premixLog || [])
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 20);

    const historyHTML = logs.length === 0
      ? '<div class="empty-state"><div class="es-text">No history yet</div></div>'
      : `<div class="audit-log" style="max-height:400px;overflow-y:auto;">
          ${logs.map(log => `
            <div class="audit-log-entry">
              <div>
                <span class="audit-action ${log.action}">${log.action}</span>
                <span style="color:var(--text-secondary);margin-left:8px;">
                  ${new Date(log.ts).toLocaleString()}
                </span>
              </div>
              <div style="font-family:var(--font-mono);">
                ${log.previousCount !== undefined
          ? `${log.previousCount} → ${log.count}`
          : log.count}
              </div>
            </div>
          `).join('')}
         </div>`;

    BB_openModal(`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;">📜 ${cocktail.name} History</h2>
        <span class="badge badge-accent">${logs.length} entries</span>
      </div>
      ${historyHTML}
    `, '520px');
  },

  /* ═══════════════════════════════════════
     PREP CALCULATION MODAL
  ═══════════════════════════════════════ */

  openPrepModal(cocktailId) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    const cocktail = this.getCocktail(item);
    if (!item || !cocktail) return;

    const usage = this.calcDailyUsage(item.premixLog || []);
    const avgDaily = usage > 0 ? usage.toFixed(1) : '0';

    BB_openModal(`
      <h2 style="margin-bottom:8px;">🧮 Calculate Prep</h2>
      <p style="color:var(--text-muted);margin-bottom:24px;">${cocktail.name}</p>

      <div class="form-row">
        <label>Days to prep for</label>
        <input type="number" id="prep-days" value="7" min="1" max="30"
          oninput="InventoryModule.updatePrepCalc('${cocktailId}', this.value)">
      </div>

      <div class="form-row">
        <label>Current stock</label>
        <input type="number" value="${item.count}" disabled style="opacity:0.6;">
      </div>

      <div class="form-row">
        <label>Avg daily usage (bottles)</label>
        <input type="text" value="${avgDaily}" disabled style="opacity:0.6;">
      </div>

      <div id="prep-result" class="prep-result-block" style="margin-top:20px;">
        <div class="prep-item">
          <span class="prep-item-name">Recommended prep:</span>
          <span class="prep-item-value" id="prep-amount">${Math.max(0, Math.ceil((usage * 7) - item.count))} bottles</span>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="BB_closeModal()">Close</button>
        <button class="btn btn-primary" onclick="InventoryModule.applyPrep('${cocktailId}')">Add Prep Batch</button>
      </div>
    `, '420px');
  },

  updatePrepCalc(cocktailId, days) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;

    const usage = this.calcDailyUsage(item.premixLog || []);
    const daysNum = parseInt(days) || 7;
    const needed = Math.max(0, Math.ceil((usage * daysNum) - item.count));

    const amountEl = document.getElementById('prep-amount');
    if (amountEl) amountEl.textContent = `${needed} bottles`;
  },

  applyPrep(cocktailId) {
    const days = parseInt(document.getElementById('prep-days')?.value) || 7;
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;

    const usage = this.calcDailyUsage(item.premixLog || []);
    const toAdd = Math.max(0, Math.ceil((usage * days) - item.count));

    if (toAdd > 0) {
      BB.dispatch({
        type: "UPDATE_COUNT",
        payload: {
          id: cocktailId,
          delta: toAdd,
          actionType: "prep"
        }
      });

      BB_toast(`Added ${toAdd} bottles to prep`, 'success');
    }

    BB_closeModal();
    BB.renderAll();
  },

  openAddModal() {
    // Placeholder for adding new inventory items
    BB_toast('Use Cocktails section to mark items as batched', 'info');
  }

};

window.InventoryModule = InventoryModule;