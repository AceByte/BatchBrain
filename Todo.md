fix phone UI (full redesign: mobile-first, single-page w/ bottom tabs, inventory = home)
mess around with some of the layout and shit
fix print feature
add velvet revere

- [ ] **Mobile App Shell (Phone)**
  - [ ] Build dedicated `MobileDashboard` layout (don’t just resize desktop)
  - [ ] Bottom tab bar: Inventory (home) / Prep / Specs
  - [ ] Sticky top app bar per tab (title + search/filter)
  - [ ] Safe-area support (iOS home indicator): padding for bottom tabs + sheets
  - [ ] Keep existing dark theme; verify contrast + consistency across tabs

- [ ] **Inventory (Phone-first)**
  - [ ] Replace dense table/grid with thumb-friendly list cards
  - [ ] Larger tap targets (>=44px); increase row padding + button sizes
  - [ ] Make “Adjust” an action (open sheet) instead of tiny inline +/- controls
  - [ ] Quick adjustments: presets (+1, -1, +0.5, custom)
  - [ ] Swipe gestures for Quick Count (swipe right +, swipe left -)
  - [ ] Haptic feedback on adjust/save (where supported)

- [ ] **Prep (Phone-first)**
  - [ ] Prep list as “session” UX: cards + drill-in detail view (still single-page)
  - [ ] One primary CTA per card (e.g. Log production / Mark complete)
  - [ ] Add “Start Prep Session” mode (optional): checklist feel

- [ ] **Specs (Phone-first)**
  - [ ] Spec list as searchable cards; tap opens full-screen details
  - [ ] Filter/sort UI moved into bottom sheet (instead of desktop toolbar)

- [ ] **Modals / Sheets (Phone)**
  - [ ] Convert key modals to bottom sheets or full-screen modals (e.g. ProductionForm)
  - [ ] Add bottom-sheet component (scrim + drag handle + close affordance)
  - [ ] Prevent background scroll when sheet is open

- [ ] **Pending Changes UX (Phone)**
  - [ ] Sticky “Unsaved changes” bar above bottom tabs (Save / Discard)
  - [ ] Per-row edited state: clear highlight + label/icon

- [ ] **Low Stock Alerts**
  - Banner or notification when items fall below threshold

- [ ] **Accessibility / Polish**
  - [ ] Respect `prefers-reduced-motion`
  - [ ] Focus states for keyboard (iPad + external keyboard)
  - [ ] Don’t rely on color alone for stock status; add text/icon

## Analytics & Reporting
- [ ] **Prep Analytics**
