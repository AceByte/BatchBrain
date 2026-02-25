/* ══════════════════════════════════════════════
   BATCHBRAIN — modules/mobile.js
   Mobile Enhancements, Touch Gestures, Bottom Nav
   ══════════════════════════════════════════════ */

const MobileModule = {
    isMobile: false,
    isTouch: false,

    init() {
        this.detectCapabilities();
        this.setupEventListeners();
        if (this.isMobile) this.setupMobileUI();
        if (this.isTouch) this.setupTouchGestures();
    },

    detectCapabilities() {
        this.isMobile = window.matchMedia('(max-width: 768px)').matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    setupEventListeners() {
        window.addEventListener('resize', BB_debounce(() => {
            const wasMobile = this.isMobile;
            this.detectCapabilities();
            if (wasMobile !== this.isMobile) location.reload();
        }, 250));

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && BB && BB.save && BB.save.flush) {
                BB.save.flush();
            }
        });
    },

    setupMobileUI() {
        this.createBottomNav();
        this.addFullscreenToggle();
        this.setupPullToRefresh();
        this.addMobileStyles();
    },

    createBottomNav() {
        if (document.getElementById('mobile-bottom-nav')) return;

        const nav = document.createElement('div');
        nav.id = 'mobile-bottom-nav';
        nav.innerHTML = `
      <nav style="position:fixed;bottom:0;left:0;right:0;height:72px;background:var(--bg-glass);backdrop-filter:var(--glass-blur);border-top:1px solid var(--border-glass);display:flex;justify-content:space-around;align-items:center;z-index:1000;padding-bottom:env(safe-area-inset-bottom,0);box-shadow:0 -10px 40px rgba(0,0,0,0.5);">
        <a href="#main-header" class="mobile-nav-item" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">
          <span style="font-size:1.4rem; filter:drop-shadow(0 0 5px var(--accent-glow));">🥃</span>
          <span style="font-size:0.75rem; font-weight:600; margin-top:4px;">Stock</span>
        </a>
        <a href="#recipes-section" class="mobile-nav-item" onclick="document.getElementById('recipes-section')?.scrollIntoView({behavior:'smooth'});return false;">
          <span style="font-size:1.4rem;">📋</span>
          <span style="font-size:0.75rem; font-weight:600; margin-top:4px;">Recipes</span>
        </a>
        <div class="mobile-nav-action" style="margin-top:-36px; padding:4px; background:var(--bg-base); border-radius:50%;">
            <button onclick="MobileModule.showQuickAddMenu();return false;" style="width:64px;height:64px;background:linear-gradient(135deg, var(--accent), var(--accent-dark));color:#0c0f17;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 8px 25px var(--accent-glow);border:none;font-weight:700;">＋</button>
        </div>
      </nav>
      <style>
        .mobile-nav-item { display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-secondary);text-decoration:none;padding:8px 12px;min-width:70px;transition:all 0.3s; }
        .mobile-nav-item:active { transform:scale(0.9); opacity:0.7; }
        #mainContent { padding-bottom:100px !important; }
        @media (min-width:769px) { #mobile-bottom-nav { display:none !important; } #mainContent { padding-bottom:40px !important; } }
      </style>
    `;
        document.body.appendChild(nav);
    },

    setupTouchGestures() {
        const main = document.getElementById('mainContent');
        if (!main) return;

        let startX = 0;
        main.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; }, { passive: true });
        main.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].screenX;
            const diff = endX - startX;
            if (Math.abs(diff) < 80) return;

            const sections = ['inventory', 'cocktails', 'specsheet', 'settings'];
            const idx = sections.indexOf(BB.currentSection);

            if (diff < 0 && idx < sections.length - 1) BB.navigate(sections[idx + 1]);
            else if (diff > 0 && idx > 0) BB.navigate(sections[idx - 1]);
        }, { passive: true });
    },

    setupPullToRefresh() {
        const main = document.getElementById('mainContent');
        if (!main) return;

        let startY = 0, pulling = false;
        const indicator = document.createElement('div');
        indicator.style.cssText = 'position:fixed;top:-60px;left:0;right:0;height:60px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:0.85rem;transition:transform 0.2s;z-index:999;';
        document.body.appendChild(indicator);

        main.addEventListener('touchstart', (e) => {
            if (main.scrollTop <= 0) { startY = e.touches[0].clientY; pulling = true; }
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const dist = Math.max(0, e.touches[0].clientY - startY);
            if (dist > 0 && dist < 150) {
                indicator.style.transform = `translateY(${dist}px)`;
                indicator.textContent = dist > 80 ? '↻ Release to refresh' : '↓ Pull to refresh';
            }
        }, { passive: false });

        const endPull = () => {
            if (pulling && parseInt(indicator.style.transform?.replace('translateY(', '')) > 80) {
                BB.load().then(() => { BB.render(); BB_toast('Refreshed', 'success'); });
            }
            indicator.style.transform = 'translateY(0)';
            pulling = false;
        };

        main.addEventListener('touchend', endPull);
        main.addEventListener('touchcancel', endPull);
    },

    addFullscreenToggle() {
        const btn = document.createElement('button');
        btn.innerHTML = '⛶';
        btn.style.cssText = 'position:fixed;bottom:90px;right:20px;width:48px;height:48px;border-radius:50%;background:var(--accent);color:#1a1200;border:none;font-size:1.2rem;display:' + (this.isMobile ? 'flex' : 'none') + ';align-items:center;justify-content:center;box-shadow:0 4px 15px var(--accent-glow);z-index:999;';
        btn.onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
            else document.exitFullscreen().catch(() => { });
        };
        document.body.appendChild(btn);
    },

    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
      @media (max-width:768px) {
        .btn { min-height:48px; min-width:48px; }
        .count-btn { width:48px; height:48px; }
        input,select,textarea { font-size:16px !important; }
        .card { padding:20px; border-radius:var(--radius-lg); }
        .modal {
            width:100vw;
            max-height:90vh;
            padding:24px;
            border-radius:var(--radius-xl) var(--radius-xl) 0 0;
            position:fixed;
            bottom:0;
            border-bottom:none;
            animation:slideUpMobile 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .sidebar { transform:translateX(-100%); transition:transform 0.4s cubic-bezier(0.32, 0.72, 0, 1); }
        .sidebar.open { transform:translateX(0); }
        .main-content { margin-left:0; padding:20px 16px; }
        .page-header { margin-bottom: 24px; }
        .page-title { font-size: 1.6rem; }
      }
      @keyframes slideUpMobile { from { transform:translateY(100%); } to { transform:translateY(0); } }
    `;
        document.head.appendChild(style);
    },

    showQuickAddMenu() {
        this.haptic('light');
        BB_openModal(`
      <h2 style="text-align:center;margin-bottom:20px;">⚡ Quick Add</h2>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
        <button class="btn btn-secondary" style="flex-direction:column;gap:8px;padding:30px 20px;" onclick="BB_closeModal();CocktailsModule.openForm();"><span style="font-size:2.5rem;">🍹</span><span style="font-weight:600;">New Cocktail</span></button>
        <button class="btn btn-secondary" style="flex-direction:column;gap:8px;padding:30px 20px;" onclick="BB_closeModal();QuickCountModule.activate();"><span style="font-size:2.5rem;">⚡</span><span style="font-weight:600;">Quick Count</span></button>
      </div>
    `, '500px');
    },

    haptic(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = { light: 10, medium: 25, heavy: 40, success: [10, 50, 10], error: [30, 100, 30, 100, 30] };
            navigator.vibrate(patterns[type] || 10);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => MobileModule.init());
window.MobileModule = MobileModule;