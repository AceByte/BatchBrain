/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/inventory.js (FIXED & IMPROVED)
   Inventory = batched cocktails only
   EXPLICIT SAVE ONLY - No auto-save
   ══════════════════════════════════════════════ */

const InventoryModule = {

  // staging helpers for edit/save workflow
  _editMode: false,
  _stagedCounts: {},
  _hasUnsavedChanges: false,

  // undo stack
  _undoStack: [],
  _maxUndoSize: 10,

  getCocktail(item) {
    return BB.state.cocktails.find(c => c.id === item.cocktailId);
  },

  calcDailyUsage(log = []) {
    if (log.length < 2) return 0;
    const sorted = [...log].sort((a, b) => a.ts - b.ts);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = (last.ts - first.ts) / (1000 * 60 * 60 * 24);
    if (days <= 0) return 0;
    const diff = first.count - last.count;
    return diff > 0 ? diff / days : 0;
  },

  render(root) {
    const inventory = BB.state.inventory;
    const needsBatching = inventory.filter(i => i.count <= i.threshold);

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
          <button class="btn btn-primary" onclick="PrepSessionModule.open()">New Prep Session</button>
          ${QuickCountModule ? QuickCountModule.renderButton() : ''}
        </div>
      </div>

      <div class="grid-3 animate-fade-in" style="margin-bottom:32px;">
        <div class="stat-pill">
          <span class="sp-label">🚨 Needs Prep</span>
          <span class="sp-value" style="color:var(--danger)">${needsBatching.length}</span>
          <span class="sp-sub">Critical level</span>
        </div>
        <div class="stat-pill">
          <span class="sp-label">✅ Healthy</span>
          <span class="sp-value" style="color:var(--success)">${inventory.length - needsBatching.length}</span>
          <span class="sp-sub">Stocked items</span>
        </div>
        <div class="stat-pill">
          <span class="sp-label">🥃 Total</span>
          <span class="sp-value">${inventory.length}</span>
          <span class="sp-sub">Tracked batches</span>
        </div>
      </div>

      <div id="premix-list" class="grid-auto">
        ${inventory.length === 0 ? `
          <div class="card" style="grid-column: 1 / -1">
            <div class="empty-state">
              <div class="es-icon">🍹</div>
              <div class="es-text">No batched cocktails yet</div>
              <div class="es-sub">Mark a cocktail as batched in the Cocktails section to track it here.</div>
            </div>
          </div>
        ` : inventory.map((i, index) => this.renderCard(i, index)).join("")}
      </div>
      <div id="inventory-footer"></div>
    `;

    // Render Save/Discard buttons
    this.renderStagingControls();
  },

  renderCard(item, index, isUrgent = false) {
    const cocktail = this.getCocktail(item);
    if (!cocktail) return '';

    const staged = this._stagedCounts[cocktail.id];
    const displayCount = (staged !== undefined) ? staged : item.count;
    const hasUnsaved = staged !== undefined && staged !== item.count;

    const usage = this.calcDailyUsage(item.premixLog || []);
    let daysLeft = '∞';
    if (usage > 0) daysLeft = (displayCount / usage).toFixed(1);

    const cardClass = isUrgent ? 'inv-card urgent' : 'inv-card';
    const cardClassWithUnsaved = hasUnsaved ? `${cardClass} has-unsaved-changes` : cardClass;

    return `
      <div class="card ${cardClassWithUnsaved} animate-slide-up" style="animation-delay: ${index * 0.03}s;" data-cocktail-id="${cocktail.id}">
        ${hasUnsaved ? `<div class="unsaved-badge" title="Changes pending save">●</div>` : ''}
        ${isUrgent ? `<div class="urgent-glow"></div><div class="urgent-tag">⚠️ URGENT PREP</div>` : ''}

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
                <span class="count-value" style="font-size:2.8rem; font-weight:800; font-family:var(--font-mono); line-height:1; color:${isUrgent ? 'var(--danger)' : 'var(--text-primary)'}">${displayCount}</span>
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
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="InventoryModule.showHistory('${cocktail.id}')">History</button>
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="InventoryModule.openPrepModal('${cocktail.id}')">Prep Calc</button>
        </div>
      </div>
      <style>
        .inv-card.urgent { border:1px solid var(--danger); box-shadow: 0 0 30px rgba(230, 117, 117, 0.1); }
        .urgent-tag { position:absolute; top:0; right:0; background:var(--danger); color:#fff; font-size:0.65rem; font-weight:800; padding:4px 10px; border-radius:0 0 0 10px; }
        .btn-count:hover:not(:disabled) { background:var(--accent-soft) !important; border-color:var(--accent-dark) !important; color:var(--accent) !important; }
        .btn-count:active { transform:scale(0.9); }
        .btn-count:disabled { opacity:0.2; cursor:not-allowed; }
        .unsaved-badge { position:absolute; top:8px; right:8px; width:12px; height:12px; background:var(--accent); border-radius:50%; box-shadow:0 0 10px var(--accent); animation:pulse 1.5s infinite; }
        .has-unsaved-changes { border-color:var(--accent) !important; box-shadow:0 0 20px rgba(212,180,124,0.15) !important; }
        @keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.1); opacity:0.8; } }
      </style>
    `;
  },

  toggleEditMode() {
    this._editMode = !this._editMode;
    if (!this._editMode) {
      this._stagedCounts = {};
      this._hasUnsavedChanges = false;
    }
    BB.renderAll();
    this.renderStagingControls();
  },

  stageDirectInput(cocktailId, raw) {
    const v = parseInt(raw) || 0;
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;
    const clamped = Math.max(0, v);

    if (clamped !== item.count) {
      this._stagedCounts[cocktailId] = clamped;
      this._hasUnsavedChanges = true;
    } else {
      delete this._stagedCounts[cocktailId];
      this._hasUnsavedChanges = Object.keys(this._stagedCounts).length > 0;
    }

    this._updateBadgeVisibility(cocktailId);
    this._updateStagingButtonCount();
    this._updateSaveStatusIndicator();
  },

  adjustCount(cocktailId, delta) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;

    const base = (this._stagedCounts[cocktailId] !== undefined) ? this._stagedCounts[cocktailId] : item.count;
    const next = Math.max(0, base + delta);

    if (next !== item.count) {
      this._stagedCounts[cocktailId] = next;
      this._hasUnsavedChanges = true;
    } else {
      delete this._stagedCounts[cocktailId];
      this._hasUnsavedChanges = Object.keys(this._stagedCounts).length > 0;
    }

    if (this._editMode) {
      const countInput = document.getElementById(`inv-count-input-${cocktailId}`);
      if (countInput) countInput.value = next;
    }

    this._updateDisplayCount(cocktailId, next);
    this._updateBadgeVisibility(cocktailId);
    this._updateStagingButtonCount();
    this._updateSaveStatusIndicator();
  },

  saveChanges() {
    BB._updateSyncStatus('saving'); // Set status to "Saving..."

    Object.entries(this._stagedCounts).forEach(([cocktailId, newCount]) => {
      const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
      if (item) item.count = newCount;
    });

    this._stagedCounts = {};
    this._hasUnsavedChanges = false;

    BB_toast('Changes saved successfully!', 'success');
    BB.renderAll();

    BB._updateSyncStatus('saved'); // Set status to "All changes saved"
  },

  discardChanges() {
    this._stagedCounts = {};
    this._hasUnsavedChanges = false;

    BB_toast('Changes discarded.', 'info');
    BB.renderAll();

    // Update sync status to "saved"
    BB._updateSyncStatus('saved');
  },

  /* ═══════════════════════════════════════
     UNDO FUNCTIONALITY
  ═══════════════════════════════════════ */

  // Push an action to the undo stack
  pushUndo(action) {
    this._undoStack.push(action);
    if (this._undoStack.length > this._maxUndoSize) {
      this._undoStack.shift();
    }
    this.showUndoToast();
  },

  // Show undo toast notification
  showUndoToast() {
    const lastAction = this._undoStack[this._undoStack.length - 1];
    if (!lastAction) return;

    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Remove existing undo toast
    const existing = container.querySelector('.undo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast toast-info show undo-toast';
    toast.innerHTML = `
      <div style="display:flex; gap:12px; align-items:center;">
        <span>${lastAction.description}</span>
        <button class="btn btn-sm btn-ghost" onclick="InventoryModule.undoLastAction();" style="font-weight:700;">↩ UNDO</button>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 8000);

    // Remove from stack after timeout
    setTimeout(() => {
      if (this._undoStack.length > 0 && this._undoStack[this._undoStack.length - 1] === lastAction) {
        this._undoStack.pop();
      }
    }, 8000);
  },

  // Undo the last action
  undoLastAction() {
    const action = this._undoStack.pop();
    if (!action) {
      BB_toast('Nothing to undo', 'info');
      return;
    }

    // Remove the undo toast
    const toast = document.querySelector('.undo-toast');
    if (toast) toast.remove();

    switch (action.type) {
      case 'countChange':
        const item = BB.state.inventory.find(i => i.cocktailId === action.cocktailId);
        if (item) {
          item.count = action.previousCount;
          BB.save();
          BB.renderAll();
          BB.checkLowStock();
          BB_toast(`Undid count change for ${action.cocktailName}`, 'success');
        }
        break;

      case 'batchEdit':
        // Restore all counts from the batch
        action.changes.forEach(change => {
          const item = BB.state.inventory.find(i => i.cocktailId === change.cocktailId);
          if (item) {
            item.count = change.previousCount;
          }
        });
        BB.save();
        BB.renderAll();
        BB.checkLowStock();
        BB_toast(`Undid batch edit (${action.changes.length} items)`, 'success');
        break;
    }
  },

  // Clear undo stack
clearUndoStack() {
  this._undoStack = [];
  const toast = document.querySelector('.undo-toast');
  if (toast) toast.remove();
},

discardStagedChanges() {
    const stagedCount = Object.keys(this._stagedCounts).length;
    this._stagedCounts = {};
    this._hasUnsavedChanges = false;
    this._editMode = false;

    BB.renderAll();

    if (stagedCount > 0) {
      BB_toast('Changes discarded', 'info');
    }

    this.renderStagingControls();
    this._updateSaveStatusIndicator();
  },

  renderStagingControls() {
    // Create a container for the buttons
    let controls = document.getElementById('save-discard-controls');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'save-discard-controls';
        controls.style = `
            position: fixed;
            bottom: 100px; /* Move above the footer */
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        `;
        document.body.appendChild(controls);
    }

    // Render the Save and Discard buttons
    controls.innerHTML = `
        <button id="btn-save" class="btn btn-primary" onclick="InventoryModule.saveChanges()" disabled>
            💾 Save Changes
        </button>
        <button id="btn-discard" class="btn btn-ghost" onclick="InventoryModule.discardChanges()" disabled>
            🗑️ Discard
        </button>
    `;

    // Update button states based on unsaved changes
    this._updateStagingButtonCount();
  },

  _updateDisplayCount(cocktailId, count) {
    const card = document.querySelector(`[data-cocktail-id="${cocktailId}"]`);
    if (!card) return;

    const countValue = card.querySelector('.count-value');
    if (countValue) countValue.textContent = count;

    const minusBtn = card.querySelector('.btn-count:first-of-type');
    if (minusBtn) minusBtn.disabled = count <= 0;
  },

  _updateBadgeVisibility(cocktailId) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    if (!item) return;

    const staged = this._stagedCounts[cocktailId];
    const hasUnsaved = staged !== undefined && staged !== item.count;
    const card = document.querySelector(`[data-cocktail-id="${cocktailId}"]`);
    if (!card) return;

    if (hasUnsaved && !card.querySelector('.unsaved-badge')) {
      const badge = document.createElement('div');
      badge.className = 'unsaved-badge';
      badge.title = 'Changes pending save';
      badge.textContent = '●';
      card.prepend(badge);
      card.classList.add('has-unsaved-changes');
    } else if (!hasUnsaved && card.querySelector('.unsaved-badge')) {
      card.querySelector('.unsaved-badge').remove();
      card.classList.remove('has-unsaved-changes');
    }
  },

  _updateStagingButtonCount() {
    const stagedCount = Object.keys(this._stagedCounts).length;
    const btnSave = document.getElementById('btn-save');
    const btnDiscard = document.getElementById('btn-discard');

    if (btnSave) {
      btnSave.disabled = stagedCount === 0;
      btnSave.style.opacity = stagedCount === 0 ? '0' : '1';
    }

    if (btnDiscard) {
      btnDiscard.disabled = stagedCount === 0;
      btnDiscard.style.opacity = stagedCount === 0 ? '0' : '1';
    }

    // Update sync status to "unsaved" if there are staged changes
    if (stagedCount > 0) {
      BB._updateSyncStatus('unsaved');
    }
  },

  _updateSaveStatusIndicator() {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;

    if (this._hasUnsavedChanges) {
      statusEl.textContent = 'Unsaved changes';
      statusEl.style.color = 'var(--warning)';
    } else {
      statusEl.textContent = navigator.onLine ? 'System Online' : 'Offline Mode';
      statusEl.style.color = navigator.onLine ? 'var(--success)' : 'var(--warning)';
    }
  },

  showHistory(cocktailId) {
    const item = BB.state.inventory.find(i => i.cocktailId === cocktailId);
    const cocktail = this.getCocktail(item);
    if (!item || !cocktail) return;

    const logs = (item.premixLog || []).slice().sort((a, b) => b.ts - a.ts).slice(0, 20);

    const historyHTML = logs.length === 0
      ? '<div class="empty-state"><div class="es-text">No history yet</div></div>'
      : `<div class="audit-log" style="max-height:400px;overflow-y:auto;">
          ${logs.map(log => `
            <div class="audit-log-entry">
              <div>
                <span class="audit-action ${log.action}">${log.action}</span>
                <span style="color:var(--text-secondary);margin-left:8px;">${new Date(log.ts).toLocaleString()}</span>
              </div>
              <div style="font-family:var(--font-mono);">
                ${log.previousCount !== undefined ? `${log.previousCount} → ${log.count}` : log.count}
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
      this._stagedCounts[cocktailId] = (this._stagedCounts[cocktailId] || item.count) + toAdd;
      this._hasUnsavedChanges = true;

      BB_toast(`Staged +${toAdd} bottles. Click Save to apply.`, 'info');

      BB_closeModal();
      BB.renderAll();
      this.renderStagingControls();
    } else {
      BB_toast('No prep needed - stock is sufficient', 'info');
      BB_closeModal();
    }
  },

  openAddModal() {
    BB_toast('Use Cocktails section to mark items as batched', 'info');
  }
};

window.InventoryModule = InventoryModule;