/* ══════════════════════════════════════════════
BATCHBRAIN — modules / quick - count.js(IMPROVED)
   Streamlined Quick Count Interface
   ══════════════════════════════════════════════ */

const QuickCountModule = {
  active: false,
  items: [],
  currentIndex: 0,
  changes: [],

  // Accessibility: Announce to screen readers
  announce(message) {
    const announcer = document.getElementById('sr-announcer') || this.createAnnouncer();
    announcer.textContent = message;
  },

  createAnnouncer() {
    const el = document.createElement('div');
    el.id = 'sr-announcer';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(el);
    return el;
  },

  activate(filter = 'all') {
    this.items = this.getFilteredItems(filter);

    if (this.items.length === 0) {
      BB_toast('No items to count', 'warning');
      this.announce('No items available for counting');
      return;
    }

    this.active = true;
    this.currentIndex = 0;
    this.changes = [];

    this.render();
    this.announce(`Quick count started. ${this.items.length} items to count.`);
  },

  getFilteredItems(filter) {
    let items = [...BB.state.inventory];

    switch (filter) {
      case "low":
        items = items.filter(i => i.count <= i.threshold);
        break;
      case "critical":
        items = items.filter(i => i.count === 0);
        break;
      case "all":
      default:
        break;
    }

    return items.sort((a, b) => {
      const ca = BB.state.cocktails.find(c => c.id === a.cocktailId);
      const cb = BB.state.cocktails.find(c => c.id === b.cocktailId);
      return (ca?.name || "").localeCompare(cb?.name || "");
    });
  },

  render() {
    const item = this.items[this.currentIndex];
    if (!item) {
      this.finish();
      return;
    }

    const cocktail = BB.state.cocktails.find(c => c.id === item.cocktailId);
    const progress = ((this.currentIndex / this.items.length) * 100).toFixed(0);
    const isLast = this.currentIndex >= this.items.length - 1;
    const usage = InventoryModule.calcDailyUsage(item.premixLog || []);
    const daysLeft = usage > 0 ? (item.count / usage).toFixed(1) : null;

    BB_openModal(`
      <div style="text-align:center;padding:10px;" role="dialog" aria-label="Quick Count Interface" aria-modal="true">
        <div style="margin-bottom:15px;">
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">⚡ Quick Count</div>
          <div style="font-size:0.9rem;color:var(--accent);margin-top:4px;font-weight:600;" aria-live="polite">${this.currentIndex + 1} of ${this.items.length}</div>
        </div>

        <div style="width:100%;height:6px;background:var(--bg-input);border-radius:3px;margin-bottom:25px;overflow:hidden;" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--accent),var(--success));transition:width 0.3s;"></div>
        </div>

        <div style="font-size:1.6rem;font-weight:700;margin-bottom:8px;color:var(--text-primary);line-height:1.2;" role="heading" aria-level="2">${cocktail?.name || 'Unknown'}</div>

        ${cocktail?.tag ? `<div style="font-size:0.85rem;color:var(--accent);margin-bottom:15px;">🏷️ ${cocktail.tag}</div>` : '<div style="margin-bottom:15px;"></div>'}

        <div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;font-size:0.8rem;">
          <div style="text-align:center;">
            <div style="color:var(--text-muted);">Current</div>
            <div style="font-family:var(--font-mono);font-size:1.1rem;color:var(--text-secondary);font-weight:600;" id="current-count-display">${item.count}</div>
          </div>
          ${daysLeft ? `
            <div style="text-align:center;">
              <div style="color:var(--text-muted);">Days Left</div>
              <div style="font-family:var(--font-mono);font-size:1.1rem;color:${daysLeft <= 3 ? 'var(--danger)' : 'var(--success)'};font-weight:600;">~${daysLeft}d</div>
            </div>
          ` : ''}
          <div style="text-align:center;">
            <div style="color:var(--text-muted);">Alert At</div>
            <div style="font-family:var(--font-mono);font-size:1.1rem;color:var(--danger);font-weight:600;">${item.threshold}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;gap:15px;margin:25px 0;">
          <button class="btn btn-secondary"
            onclick="QuickCountModule.adjust(-1)"
            style="width:70px;height:70px;font-size:2rem;border-radius:var(--radius-lg);"
            aria-label="Decrease count by 1"
            tabindex="0">
            −
          </button>

          <div style="position:relative;">
            <input type="number"
              id="qc-count"
              value="${item.count}"
              min="0"
              max="999"
              style="width:140px;height:90px;font-size:3rem;text-align:center;font-family:var(--font-mono);font-weight:700;border:2px solid var(--border);border-radius:var(--radius-md);"
              onkeydown="QuickCountModule.handleKey(event)"
              onfocus="this.select()"
              oninput="QuickCountModule.validateInput(this)"
              aria-label="Bottle count"
              inputmode="numeric"
              pattern="[0-9]*">
            <div style="position:absolute;bottom:-22px;left:0;right:0;text-align:center;font-size:0.75rem;color:var(--text-muted);">bottles</div>
          </div>

          <button class="btn btn-secondary"
            onclick="QuickCountModule.adjust(1)"
            style="width:70px;height:70px;font-size:2rem;border-radius:var(--radius-lg);"
            aria-label="Increase count by 1"
            tabindex="0">
            +
          </button>
        </div>

        <div style="display:flex;justify-content:center;gap:8px;margin:20px 0;flex-wrap:wrap;" role="group" aria-label="Quick set values">
          ${[0, 5, 10, 15, 20].map(n => `<button class="btn btn-ghost btn-sm" onclick="QuickCountModule.setValue(${n})" style="min-width:45px;" aria-label="Set count to ${n}">${n}</button>`).join('')}
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-top:25px;">
          <button class="btn btn-ghost" onclick="QuickCountModule.prev()" ${this.currentIndex === 0 ? 'disabled' : ''} aria-label="Previous item">← Prev</button>
          <button class="btn btn-secondary" onclick="QuickCountModule.skip()" aria-label="Skip this item">Skip</button>
          <button class="btn btn-primary" onclick="QuickCountModule.saveAndNext()" style="min-width:120px;" aria-label="${isLast ? 'Finish and save' : 'Save and go to next item'}">${isLast ? '✓ Finish' : 'Next →'}</button>
        </div>

        <div style="margin-top:20px;padding-top:15px;border-top:1px solid var(--border);font-size:0.7rem;color:var(--text-muted);">
          <kbd>↑</kbd> <kbd>↓</kbd> Adjust • <kbd>0-9</kbd> Type • <kbd>Enter</kbd> Next • <kbd>Esc</kbd> Exit
        </div>
      </div>
    `, '480px');

    // Focus management for accessibility
    setTimeout(() => {
      const input = document.getElementById('qc-count');
      if (input) {
        input.focus();
        input.select();
        // Trap focus in modal
        this.trapFocus();
      }
    }, 100);

    if (window.MobileModule) MobileModule.haptic('light');
  },

  // Accessibility: Trap focus within modal
  trapFocus() {
    const modal = document.getElementById('modalBox');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    });
  },

  validateInput(input) {
    // Prevent negative numbers and limit to reasonable range
    let value = parseInt(input.value) || 0;
    if (value < 0) value = 0;
    if (value > 999) value = 999;
    input.value = value;
  },

  adjust(delta) {
    const input = document.getElementById('qc-count');
    const current = parseInt(input.value) || 0;
    const newValue = Math.max(0, Math.min(999, current + delta));
    input.value = newValue;
    input.focus();
    if (window.MobileModule) MobileModule.haptic('light');
  },

  setValue(val) {
    const input = document.getElementById('qc-count');
    input.value = val;
    input.focus();
    input.select();
    this.announce(`Count set to ${val}`);
  },

  handleKey(e) {
    switch (e.key) {
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        this.saveAndNext();
        break;
      case 'Escape':
        this.confirmExit();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.adjust(1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.adjust(-1);
        break;
      case 'PageUp':
        e.preventDefault();
        this.adjust(5);
        break;
      case 'PageDown':
        e.preventDefault();
        this.adjust(-5);
        break;
    }
  },

  saveAndNext() {
    const input = document.getElementById('qc-count');
    if (!input) return;

    const newCount = parseInt(input.value) || 0;
    const item = this.items[this.currentIndex];

    if (newCount !== item.count) {
      this.changes.push({
        id: item.cocktailId,
        name: item.name || 'Unknown',
        oldCount: item.count,
        newCount: newCount
      });

      const delta = newCount - item.count;

      BB.dispatch({
        type: "SET_COUNT",
        payload: {
          id: item.cocktailId,
          count: newCount,
          actionType: 'quickcount'
        }
      });

      if (window.MobileModule) MobileModule.haptic('success');
      this.announce(`${item.name || 'Item'} updated from ${item.oldCount} to ${newCount}`);
    }

    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.render();
    } else {
      this.finish();
    }
  },

  skip() {
    this.announce('Item skipped');
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.render();
    } else {
      this.finish();
    }
  },

  prev() {
    if (this.currentIndex > 0) {
      // Save current value before going back
      const newCount = parseInt(document.getElementById('qc-count')?.value) || 0;
      const item = this.items[this.currentIndex];
      if (item && newCount !== item.count) {
        item.count = newCount;
      }

      this.currentIndex--;
      this.render();
    }
  },

  finish() {
    if (this.changes.length > 0) {
      BB.save();
    }

    BB_closeModal();
    this.active = false;

    const summary = this.changes.length > 0
      ? `${this.changes.length} items updated`
      : 'No changes made';

    BB_toast(`Quick count complete! ${summary}`, 'success');
    this.announce(`Quick count complete. ${summary}`);
    BB.navigate('inventory');

    this.items = [];
    this.changes = [];
    this.currentIndex = 0;
  },

  confirmExit() {
    if (this.changes.length > 0 && !confirm(`You have ${this.changes.length} unsaved changes. Exit anyway?`)) {
      return;
    }
    BB_closeModal();
    this.active = false;
    this.items = [];
    this.changes = [];
    this.announce('Quick count cancelled');
  },

  renderButton() {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="QuickCountModule.activate('all')" aria-label="Quick count all items">⚡ Quick Count All</button>
        <button class="btn btn-ghost btn-sm" onclick="QuickCountModule.activate('low')" aria-label="Quick count low stock items only">Low Stock Only</button>
        <button class="btn btn-ghost btn-sm" onclick="QuickCountModule.activate('critical')" aria-label="Quick count critical items only">Critical Only</button>
      </div>
    `;
  }
};

window.QuickCountModule = QuickCountModule;