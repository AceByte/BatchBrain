/* ══════════════════════════════════════════════
   BATCHBRAIN — app.js (COMPLETE SINGLE-SCROLL VERSION – NO TABS)
   ══════════════════════════════════════════════ */

function BB_debounce(func, wait = 300, options = {}) {
  const { leading = false, trailing = true, maxWait } = options;
  let timeout, lastCallTime, lastInvokeTime, result, lastArgs;

  const invokeFunc = (time) => {
    const args = lastArgs;
    lastArgs = undefined;
    lastInvokeTime = time;
    result = func.apply(this, args);
    return result;
  };

  const leadingEdge = (time) => {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return maxWait ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
  };

  const shouldInvoke = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (lastCallTime === undefined) ||
      (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) ||
      (maxWait && timeSinceLastInvoke >= maxWait);
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time) => {
    timeout = undefined;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    return result;
  };

  const debounced = function (...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }

    if (timeout === undefined) {
      timeout = setTimeout(timerExpired, wait);
    }

    return result;
  };

  debounced.cancel = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    timeout = undefined;
  };

  debounced.flush = () => {
    return timeout === undefined ? result : trailingEdge(Date.now());
  };

  debounced.pending = () => timeout !== undefined;

  return debounced;
}

function BB_throttle(func, wait, options) {
  return BB_debounce(func, wait, { ...options, maxWait: wait });
}

window.BB_debounce = BB_debounce;
window.BB_throttle = BB_throttle;


/* ──────────────────────────────────────────────
   UI HELPERS (TOAST & MODAL) - IMPROVED
────────────────────────────────────────────── */

function BB_toast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon" aria-hidden="true">${getToastIcon(type)}</span>
      <span class="toast-msg">${message}</span>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("show"));

  // Auto-remove
  const removeTimeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);

  // Allow manual dismissal
  toast.addEventListener('click', () => {
    clearTimeout(removeTimeout);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  });
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

function BB_openModal(html, maxWidth = "600px") {
  const overlay = document.getElementById("modalOverlay");
  const box = document.getElementById("modalBox");
  const body = document.getElementById("modalBody");

  if (!overlay || !box || !body) {
    console.error('Modal elements not found');
    return;
  }

  // Store last focused element for restoration
  BB._lastFocusedElement = document.activeElement;

  body.innerHTML = html;
  box.style.maxWidth = maxWidth;
  overlay.style.display = "flex";
  overlay.setAttribute('aria-hidden', 'false');

  // Prevent body scroll
  document.body.style.overflow = "hidden";

  // Add escape key handler
  BB._modalEscapeHandler = (e) => {
    if (e.key === 'Escape') {
      BB_closeModal();
    }
  };
  document.addEventListener('keydown', BB._modalEscapeHandler);
}

function BB_closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.style.display = "none";
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = "";

  // Remove escape handler
  if (BB._modalEscapeHandler) {
    document.removeEventListener('keydown', BB._modalEscapeHandler);
    BB._modalEscapeHandler = null;
  }

  // Restore focus
  if (BB._lastFocusedElement) {
    BB._lastFocusedElement.focus();
    BB._lastFocusedElement = null;
  }
}

window.BB_toast = BB_toast;
window.BB_openModal = BB_openModal;
window.BB_closeModal = BB_closeModal;


/* ──────────────────────────────────────────────
   EVENT BUS
────────────────────────────────────────────── */

const BB_EventBus = {
  _events: {},

  on(event, cb) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(cb);
    return () => this.off(event, cb);
  },

  off(event, cb) {
    if (!this._events[event]) return;
    this._events[event] =
      this._events[event].filter(x => x !== cb);
  },

  emit(event, data) {
    if (!this._events[event]) return;
    this._events[event].forEach(cb => {
      try { cb(data); }
      catch (e) { console.error(e); }
    });
  }
};

window.BB_EventBus = BB_EventBus;


/* ──────────────────────────────────────────────
   CORE SYSTEMS (ERROR, THEME, SYNC) - IMPROVED
────────────────────────────────────────────── */

const ErrorResilience = {
  errorLog: [],
  maxLogSize: 50,

  init() {
    window.addEventListener('error', (e) => this.handleError(e));
    window.addEventListener('unhandledrejection', (e) => this.handleRejection(e));
    this.wrapCoreMethods();
    console.log('[ErrorResilience] Initialized');
  },

  handleError(event) {
    const errorInfo = {
      type: 'runtime',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logError(errorInfo);

    if (!this.isCriticalError(event.error)) {
      event.preventDefault();
      this.showUserFeedback('warning', 'Something went wrong, but you can keep working');
      return false;
    }

    this.showUserFeedback('error', 'Critical error detected. Please refresh the page.');
  },

  handleRejection(event) {
    const errorInfo = {
      type: 'promise',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: Date.now(),
      url: window.location.href
    };

    this.logError(errorInfo);
    event.preventDefault();

    if (this.isNetworkError(event.reason)) {
      this.showUserFeedback('warning', 'Network issue - working offline mode');
      BB_EventBus.emit('network:offline');
    }
  },

  isCriticalError(error) {
    if (!error) return false;
    const msg = error.message || '';
    return msg.includes('IndexedDB') || msg.includes('localStorage') || msg.includes('out of memory');
  },

  isNetworkError(error) {
    if (!error) return false;
    const msg = error.message || '';
    return msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch');
  },

  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    try {
      localStorage.setItem('bb_error_log', JSON.stringify(this.errorLog));
    } catch (e) { }

    console.error('[ErrorResilience]', errorInfo);
  },

  showUserFeedback(type, message) {
    if (typeof BB_toast === 'function') {
      BB_toast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}]`, message);
    }
  },

  wrapCoreMethods() {
    const modules = [InventoryModule, CocktailsModule, SpecSheetModule, QuickCountModule];
    modules.forEach(module => {
      if (!module) return;
      Object.keys(module).forEach(key => {
        const original = module[key];
        if (typeof original === 'function' && !key.startsWith('_')) {
          module[key] = (...args) => {
            try {
              const result = original.apply(module, args);
              if (result && typeof result.then === 'function') {
                return result.catch(e => {
                  ErrorResilience.handleModuleError(key, e);
                  throw e;
                });
              }
              return result;
            } catch (e) {
              ErrorResilience.handleModuleError(key, e);
              throw e;
            }
          };
        }
      });
    });
  },

  handleModuleError(methodName, error) {
    this.logError({
      type: 'module',
      method: methodName,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });

    if (!this.isCriticalError(error)) {
      this.showUserFeedback('warning', `Error in ${methodName} - please try again`);
    }
  }
};


const ConflictResolution = {
  syncInProgress: false,
  lastSync: 0,
  syncInterval: 30000,

  init() {
    this.setupNetworkListeners();
    // Removed periodic sync to prevent overwriting manual file edits
    // this.startPeriodicSync();

    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'PROCESS_SYNC_QUEUE') {
        this.processSyncQueue();
      }
    });
  },

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[Sync] Back online, syncing...');
      BB_toast('Back online - syncing data...', 'success');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] Gone offline');
      BB_toast('Working offline - changes saved locally', 'warning');
    });
  },

  startPeriodicSync() {
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.sync();
      }
    }, this.syncInterval);
  },

  async sync() {
    if (this.syncInProgress || !navigator.onLine) return;
    this.syncInProgress = true;

    try {
      const response = await fetch(BB.API_URL);
      if (!response.ok) throw new Error('Server error');

      const serverData = await response.json();
      const localData = BB.state;

      const merged = this.mergeData(localData, serverData);

      BB.state = merged;
      BB.save();

      await fetch(BB.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });

      this.lastSync = Date.now();
      BB_EventBus.emit('sync:complete', { timestamp: this.lastSync });

    } catch (error) {
      console.error('[Sync] Failed:', error);
      BB_EventBus.emit('sync:error', { error });
    } finally {
      this.syncInProgress = false;
    }
  },

  mergeData(local, server) {
    const merged = {
      config: { ...local.config, ...server.config },
      inventory: this.mergeCollection(local.inventory || [], server.inventory || [], 'cocktailId', this.mergeItem),
      cocktails: this.mergeCollection(local.cocktails || [], server.cocktails || [], 'id', this.mergeItem),
      prepLogs: this.mergeLogs(local.prepLogs || [], server.prepLogs || [])
    };
    return merged;
  },

  mergeCollection(local, server, key, mergeFn) {
    const map = new Map();
    server.forEach(item => map.set(item[key], item));

    local.forEach(localItem => {
      const serverItem = map.get(localItem[key]);
      if (serverItem) {
        map.set(localItem[key], mergeFn(localItem, serverItem));
      } else {
        map.set(localItem[key], localItem);
      }
    });

    return Array.from(map.values());
  },

  mergeItem(local, server) {
    const localTime = local.lastModified || local.premixLog?.[local.premixLog.length - 1]?.ts || 0;
    const serverTime = server.lastModified || server.premixLog?.[server.premixLog.length - 1]?.ts || 0;

    if (localTime > serverTime) {
      return { ...local, premixLog: this.mergeLogs(local.premixLog || [], server.premixLog || []) };
    }
    return { ...server, premixLog: this.mergeLogs(local.premixLog || [], server.premixLog || []) };
  },

  mergeLogs(local, server) {
    const combined = [...local, ...server];
    const seen = new Set();
    return combined
      .filter(log => {
        const key = `${log.ts}_${log.count}_${log.action}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.ts - b.ts);
  },

  async processSyncQueue() {
    if (!navigator.onLine) return;

    const queue = JSON.parse(localStorage.getItem('bb_sync_queue') || '[]');
    if (queue.length === 0) return;

    const remaining = [];

    for (const op of queue) {
      try {
        await this.processOperation(op);
      } catch (e) {
        op.retryCount = (op.retryCount || 0) + 1;
        if (op.retryCount < 3) remaining.push(op);
      }
    }

    localStorage.setItem('bb_sync_queue', JSON.stringify(remaining));

    if (remaining.length === 0) {
      BB_toast('All changes synced', 'success');
    }
  },

  async processOperation(op) {
    switch (op.type) {
      case 'update':
        await fetch(`${BB.API_URL}/${op.entity}/${op.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
        break;
      case 'delete':
        await fetch(`${BB.API_URL}/${op.entity}/${op.id}`, { method: 'DELETE' });
        break;
      default:
        await this.sync();
    }
  },

  queueOperation(operation) {
    const queue = JSON.parse(localStorage.getItem('bb_sync_queue') || '[]');
    queue.push({ ...operation, timestamp: Date.now(), retryCount: 0 });
    localStorage.setItem('bb_sync_queue', JSON.stringify(queue));

    if ('serviceWorker' in navigator && 'sync' in window.registration) {
      window.registration.sync.register('batchbrain-sync').catch(() => { });
    }
  }
};

window.ErrorResilience = ErrorResilience;
window.ConflictResolution = ConflictResolution;


/* ──────────────────────────────────────────────
   APP DEFAULTS
────────────────────────────────────────────── */

const APP_DEFAULTS = {
  bottleMl: 700,
  defaultThreshold: 2,
  perishables: "lemon,lime,juice,egg,cream,mint,basil,cucumber,fruit"
};


/* ──────────────────────────────────────────────
   MAIN APP - IMPROVED
────────────────────────────────────────────── */

const BB = {

  API_URL: "http://localhost:3000/api/data",

  currentSection: "main",  // fixed - we don't switch anymore

  state: {
    version: 2,
    cocktails: [],
    inventory: [],
    prepLogs: [],
    config: {
      bottleMl: 700,
      defaultThreshold: 2,
      perishables: "lemon,lime,juice,egg,cream,mint,basil,cucumber,fruit"
    },
    searchQuery: ""
  },

  // Track loading state
  isLoading: false,

  /* ═══════════════════════════════════════
     LOAD / SAVE - IMPROVED
  ═══════════════════════════════════════ */

  async load() {
    this.isLoading = true;
    BB_EventBus.emit('app:loading', { loading: true });

    try {
      // 1. Load from localStorage as a fast base (cache)
      const saved = localStorage.getItem("batchbrain_v1");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.state = { ...this.state, ...parsed };
          BB_EventBus.emit('app:loaded', { source: 'cache' });
        } catch (e) {
          console.warn("Failed to parse local data");
        }
      }

      // 2. Try to fetch from server (source of truth)
      if (navigator.onLine) {
        try {
          const res = await fetch(this.API_URL);
          if (res.ok) {
            const data = await res.json();
            if (data && (data.cocktails?.length > 0 || data.inventory?.length > 0)) {
              console.log("Server data loaded — syncing state");
              // Trust server data as-is without aggressive local sanitization
              this.state = { ...this.state, ...data };

              localStorage.setItem("batchbrain_v1", JSON.stringify(this.state));
              BB_EventBus.emit('app:loaded', { source: 'server' });
            }
          }
        } catch (e) {
          console.log("Server unavailable — running in local mode");
          BB_EventBus.emit('app:loaded', { source: 'local', error: e.message });
        }
      }
    } finally {
      this.isLoading = false;
      BB_EventBus.emit('app:loading', { loading: false });
    }
  },

  save(logEntry = null) {
    try {
      localStorage.setItem(
        "batchbrain_v1",
        JSON.stringify(this.state)
      );
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      BB_toast('Failed to save locally', 'error');
    }

    // Emit saving (UI can show spinner)
    BB_EventBus.emit('data:saving');

    // Debounced server sync: collect last logEntry and schedule a single sync
    this._pendingLogEntry = logEntry || this._pendingLogEntry || null;

    // Clear any pending timer
    if (this._pendingSyncTimeout) {
      clearTimeout(this._pendingSyncTimeout);
    }

    // Schedule a network sync (batch multiple saves)
    this._pendingSyncTimeout = setTimeout(async () => {
      this._pendingSyncTimeout = null;
      try {
        if (navigator.onLine) {
          await this.syncToServer(this._pendingLogEntry);
        }
      } catch (e) {
        console.warn('Debounced sync failed', e);
      } finally {
        this._pendingLogEntry = null;
        // Notify saved (debounced completed)
        BB_EventBus.emit('data:saved');
      }
    }, 2000); // 2s debounce - adjust as needed
  },

  // Expose a flush helper (used by MobileModule / visibility handlers)
  // Use BB.save.flush() to force immediate sync
  flush() {
    if (this._pendingSyncTimeout) {
      clearTimeout(this._pendingSyncTimeout);
      this._pendingSyncTimeout = null;
    }
    return this.syncToServer(this._pendingLogEntry);
  },

  async syncToServer(logEntry = null) {
    if (!navigator.onLine) return;

    try {
      const payload = JSON.parse(JSON.stringify(this.state));
      if (payload.inventory) payload.inventory.forEach(item => item.premixLog = []);
      payload.prepLogs = [];
      if (logEntry) payload.lastLogEntry = logEntry;

      // UI: indicate network sync
      BB_EventBus.emit('sync:starting');

      await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      BB_EventBus.emit("data:saved");
      BB_EventBus.emit('sync:complete');
    } catch (e) {
      console.log("Offline — saved locally");
      BB_EventBus.emit('sync:error', { error: e });
      if (window.ConflictResolution) {
        ConflictResolution.queueOperation({ type: 'sync' });
      }
    }
  },

  /* ═══════════════════════════════════════
     DISPATCH
  ═══════════════════════════════════════ */

  dispatch(action) {

    switch (action.type) {

      case "ADD_COCKTAIL": {
        const cocktail = action.payload;
        this.state.cocktails.push(cocktail);
        if (cocktail.isBatched) this.ensurePremix(cocktail.id);
        break;
      }

      case "UPDATE_COCKTAIL": {
        const c = this.state.cocktails.find(x => x.id === action.payload.id);
        if (!c) break;
        Object.assign(c, action.payload);
        if (c.isBatched) this.ensurePremix(c.id);
        else this.removePremix(c.id);
        break;
      }

      case "DELETE_COCKTAIL": {
        const id = action.payload.id;
        this.state.cocktails = this.state.cocktails.filter(c => c.id !== id);
        this.removePremix(id);
        break;
      }

      case "UPDATE_COUNT": {
        const item = this.state.inventory.find(i => i.cocktailId === action.payload.id);
        if (!item) break;

        const newCount = Math.max(0, item.count + action.payload.delta);
        const actualDelta = newCount - item.count;
        if (actualDelta === 0) break;

        item.count = newCount;
        const logEntry = this._addLogWithGrouping(item, actualDelta, action.payload.actionType || "adjust");
        this.save(logEntry);
        BB_EventBus.emit("state:changed", action);
        return; // Already called save
      }

      case "SET_COUNT": {
        const item = this.state.inventory.find(i => i.cocktailId === action.payload.id);
        if (!item) break;

        const newCount = Math.max(0, action.payload.count);
        const previousCount = item.count;
        if (newCount === previousCount) break;

        const delta = newCount - previousCount;
        item.count = newCount;
        const logEntry = this._addLogWithGrouping(item, delta, action.payload.actionType || "set");
        this.save(logEntry);
        BB_EventBus.emit("state:changed", action);
        return; // Already called save
      }
    }

    this.save();
    BB_EventBus.emit("state:changed", action);
  },

  /* ═══════════════════════════════════════
     PREMIX HELPERS
  ═══════════════════════════════════════ */

  ensurePremix(cocktailId) {
    const exists = this.state.inventory.find(i => i.cocktailId === cocktailId);
    if (exists) return;

    this.state.inventory.push({
      cocktailId,
      count: 0,
      threshold: APP_DEFAULTS.defaultThreshold,
      premixLog: []
    });
  },

  removePremix(cocktailId) {
    this.state.inventory = this.state.inventory.filter(i => i.cocktailId !== cocktailId);
  },

  /* ═══════════════════════════════════════
     RENDERER & NAVIGATION
  ═══════════════════════════════════════ */

  renderAll() {
    const root = document.getElementById("app-root");
    if (!root) return;

    const inventory = this.state.inventory || [];
    const cocktails = this.state.cocktails || [];

    const needsPrep = inventory.filter(i => (i.count || 0) <= (i.threshold || this.state.config.defaultThreshold || 999));
    const healthy = inventory.filter(i => (i.count || 0) > (i.threshold || this.state.config.defaultThreshold || 999));

    root.innerHTML = `
      <div class="page-header" id="main-header" style="margin-bottom:48px;">
        <div class="header-content">
          <div class="header-info">
            <h1 class="page-title">
              <span class="page-icon">🥃</span>
              Batched Cocktails
            </h1>
            <p class="page-subtitle">
              Live inventory tracking and production management.
            </p>
          </div>
          <div class="header-actions">
            ${window.QuickCountModule ? QuickCountModule.renderButton() : ''}
            <button class="btn btn-primary" onclick="CocktailsModule.openForm()">
              <span style="font-size:1.2rem; margin-right:4px;">＋</span> New cocktail
            </button>
          </div>
        </div>
      </div>

      <div class="grid-3 animate-fade-in" style="margin-bottom:64px; gap:24px;">
        <div class="stat-pill">
          <span class="sp-label">🚨 Needs Prep</span>
          <span class="sp-value" style="color:var(--danger)">${needsPrep.length}</span>
          <span class="sp-sub">Critical stock levels</span>
        </div>
        <div class="stat-pill">
          <span class="sp-label">✅ Healthy</span>
          <span class="sp-value" style="color:var(--success)">${healthy.length}</span>
          <span class="sp-sub">Items well-stocked</span>
        </div>
        <div class="stat-pill">
          <span class="sp-label">📊 Total</span>
          <span class="sp-value">${inventory.length}</span>
          <span class="sp-sub">Tracked batches</span>
        </div>
      </div>

      <div class="content-section">
        ${needsPrep.length > 0 ? `
          <div class="section-header" style="display:flex; align-items:center; gap:12px; margin-bottom:28px;">
             <div style="width:12px; height:12px; border-radius:50%; background:var(--danger); box-shadow:0 0 10px var(--danger);"></div>
             <h2 style="font-size:1.5rem; font-weight:700;">Prep Required Now</h2>
          </div>
          <div class="grid-auto" style="margin-bottom:80px;">
            ${needsPrep.map((item, idx) => InventoryModule.renderCard(item, idx, true)).join('')}
          </div>
        ` : `
          <div class="card" style="text-align:center; padding:64px 32px; margin-bottom:64px; border:2px solid var(--success); background:rgba(120, 214, 137, 0.05);">
            <div style="font-size:4rem; margin-bottom:20px;">🥃</div>
            <h2 style="color:var(--success); margin-bottom:8px;">Zero Prep Needed</h2>
            <p style="color:var(--text-secondary); font-size:1.1rem;">All batched items are currently above threshold.</p>
          </div>
        `}

        <div class="section-header" style="margin:64px 0 32px;">
          <h2 style="font-size:1.5rem; font-weight:700; color:var(--text-secondary);">Inventory Overview</h2>
        </div>

        ${inventory.length === 0 ? `
          <div class="card empty-state" style="padding:100px 32px; text-align:center;">
            <div style="font-size:5rem; opacity:0.15; margin-bottom:32px;">🍹</div>
            <h2 style="margin-bottom:12px;">Start your inventory</h2>
            <p style="color:var(--text-muted); max-width:440px; margin:0 auto 32px; font-size:1.05rem;">
              Mark recipes as "Batched" to track their stock levels and receive prep alerts.
            </p>
            <button class="btn btn-secondary" onclick="BB.scrollTo('#recipes-section')">
              View Recipes ↓
            </button>
          </div>
        ` : `
          <div class="grid-auto" style="margin-bottom:96px;">
            ${inventory.map((item, idx) => InventoryModule.renderCard(item, idx, false)).join('')}
          </div>
        `}
      </div>

      <div id="recipes-section" style="padding-top:100px; margin-top:40px; border-top:1px solid var(--border);">
        <div class="page-header" style="margin-bottom:48px;">
          <div class="header-content">
            <div class="header-info">
              <h1 class="page-title">
                <span class="page-icon">📋</span>
                Specifications
              </h1>
              <p class="page-subtitle">
                House recipes, garnish specs, and build ratios.
              </p>
            </div>
            <div class="header-actions">
              <button class="btn btn-primary" onclick="CocktailsModule.openForm()">
                <span style="font-size:1.2rem; margin-right:4px;">＋</span> Add Recipe
              </button>
            </div>
          </div>
        </div>

        ${cocktails.length === 0 ? `
          <div class="card empty-state" style="padding:100px 32px; text-align:center;">
            <div style="font-size:5rem; opacity:0.15; margin-bottom:32px;">🍸</div>
            <h2 style="margin-bottom:12px;">No recipes found</h2>
            <button class="btn btn-primary" onclick="CocktailsModule.openForm()">
              Create first recipe
            </button>
          </div>
        ` : `
          <div class="grid-auto">
            ${cocktails.map((c, idx) => SpecSheetModule.renderRecipeCard(c, idx)).join('')}
          </div>
        `}
      </div>
    `;

    this.checkLowStock();
  },

  scrollTo(selector) {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  navigate(target) {
    // Simplified navigation - just scroll to sections
    if (target === "inventory" || target === "main") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "specsheet" || target === "cocktails" || target === "recipes") {
      this.scrollTo("#recipes-section");
    }
  },

  async manualSync() {
    if (!navigator.onLine) {
      BB_toast('You are offline. Changes will sync when connection returns.', 'warning');
      return;
    }

    BB_toast("Syncing data...", "info");
    try {
      if (window.ConflictResolution) await ConflictResolution.sync();
      else await this.syncToServer();
      BB_toast("Data synced successfully!", "success");
    } catch (e) {
      BB_toast("Sync failed. Using local storage.", "error");
    }
  },

  /* ═══════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════ */

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  },

  checkLowStock() {
    const low = this.state.inventory.filter(i => i.count <= (i.threshold || 2));
    const banner = document.getElementById("lowStockBanner");
    if (!banner) return;

    if (low.length > 0) {
      banner.style.display = "flex";
      banner.setAttribute('role', 'alert');
      const textEl = document.getElementById("lowStockBannerText");
      if (textEl) textEl.innerText = `${low.length} batched cocktails need prep`;

      const badge = document.getElementById("badge-low-stock");
      if (badge) {
        badge.style.display = "flex";
        badge.innerText = low.length;
        badge.setAttribute('aria-label', `${low.length} items low on stock`);
      }
    } else {
      banner.style.display = "none";
      banner.removeAttribute('role');
      const badge = document.getElementById("badge-low-stock");
      if (badge) badge.style.display = "none";
    }
  },

  _addLogWithGrouping(item, delta, action) {
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    const lastLog = item.premixLog[item.premixLog.length - 1];

    const cocktail = this.state.cocktails.find(c => c.id === item.cocktailId);
    const cocktailName = cocktail ? cocktail.name : item.cocktailId;

    if (lastLog && (now - lastLog.ts < THREE_HOURS) && lastLog.action === action) {
      // NOTE: We no longer modify the state array here because we want to move logs to an external file.
      // However, for the sake of the session, we return the grouped log entry so the server can update it.
      return { ...lastLog, ts: now, delta: (lastLog.delta || 0) + delta, count: item.count, cocktailName };
    } else {
      const newLog = {
        ts: now,
        count: item.count,
        previousCount: item.count - delta,
        delta: delta,
        action: action
      };
      // We no longer push to item.premixLog
      return { ...newLog, cocktailName };
    }
  },



  /* ═══════════════════════════════════════
     INIT
  ═══════════════════════════════════════ */

  init() {
    this.load();
    if (window.MobileModule) MobileModule.init();
    this.renderAll();

    // update header UI for save/sync
    BB_EventBus.on('data:saving', () => {
      const syncBtn = document.querySelector('.btn-sync');
      if (syncBtn) syncBtn.innerText = 'Saving... ☁️';
      const status = document.getElementById('connection-status');
      if (status) status.innerText = 'Saving…';
    });
    BB_EventBus.on('data:saved', () => {
      const syncBtn = document.querySelector('.btn-sync');
      if (syncBtn) syncBtn.innerText = 'Sync & Save ☁️';
      const status = document.getElementById('connection-status');
      if (status) status.innerText = 'All changes saved';
      setTimeout(() => {
        if (status && BB.isLoading === false) status.innerText = 'System Online';
      }, 2500);
    });
    BB_EventBus.on('sync:error', () => {
      const status = document.getElementById('connection-status');
      if (status) status.innerText = 'Sync Error';
    });

    // Global undo handler: show a toast with action
    BB_EventBus.on('undo:available', (data) => {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast toast-info show';
      toast.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
          <div>Change saved —</div>
          <button class="btn btn-sm btn-ghost" id="toast-undo">UNDO</button>
        </div>
      `;
      container.appendChild(toast);

      const undoBtn = toast.querySelector('#toast-undo');
      const timeout = setTimeout(() => { toast.remove(); }, 8000);

      undoBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        // revert: dispatch inverse update
        const delta = data.logEntry.delta || 0;
        if (delta) {
          BB.dispatch({ type: "UPDATE_COUNT", payload: { id: data.cocktailId, delta: -delta, actionType: "undo" } });
          BB_toast('Change undone', 'success');
        }
        toast.remove();
      });

      toast.addEventListener('click', () => {
        clearTimeout(timeout);
        toast.remove();
      });
    });
  },

  handleUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'quickcount') {
      setTimeout(() => {
        if (window.QuickCountModule) QuickCountModule.activate('all');
      }, 500);
    }

    if (params.get('action') === 'addcocktail') {
      setTimeout(() => {
        if (window.CocktailsModule) CocktailsModule.openForm();
      }, 500);
    }

    const cocktailId = params.get('cocktail');
    if (cocktailId) {
      setTimeout(() => this.navigateToResult(cocktailId), 500);
    }
  },

  async exportData(format = 'json') {
    const content = JSON.stringify(this.state, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batchbrain-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    BB_toast('Exported backup', 'success');
  },

  importDataFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Basic validation
        if (!data.cocktails || !data.inventory) throw new Error('Invalid backup format');
        this.state = { ...this.state, ...data };
        this.save();
        this.renderAll();
        BB_toast('Data imported', 'success');
      } catch (err) {
        BB_toast('Import failed: invalid file', 'error');
      }
    };
    reader.readAsText(file);
  },

  promptImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const f = e.target.files[0];
      if (f) this.importDataFile(f);
    };
    input.click();
  },
};


/* ──────────────────────────────────────────────
   START APP
────────────────────────────────────────────── */

window.BB = BB;

document.addEventListener("DOMContentLoaded", () => {
  BB.init();
});