# 📝 BarBatch Feature TODO List

## Prep & Inventory
- [ ] **New Prep Session Button**
  - Auto-detect what’s below threshold
  - Suggest minimum batches to prep (just enough to go over threshold)
  - Show batch recipes and generate a shopping list (in bottles, not parts)
  - Export/print shopping list

- [ ] **Bulk Actions in Inventory**
  - Multi-select inventory items
  - Batch mark as prepped, adjust thresholds, or delete

- [ ] **Save Button for Inventory**
  - Only save changes when user clicks "Save" (not on every input)

- [ ] **Undo/Redo for Inventory Changes**
  - Show undo snackbar after a count change (using `_addLogWithGrouping`)

## Data & Sync
- [ ] **Sync Status Indicator**
  - Show "Saving...", "All changes saved", or "Sync Error" in the header

- [ ] **Import/Export Data**
  - Export all data as JSON
  - Import JSON to restore/replace data

- [ ] **Sync Conflict UI**
  - When `ConflictResolution.mergeData` finds differences, let user pick which version to keep

## UI/UX Improvements
- [ ] **Ingredient Typeahead**
  - Autocomplete for ingredient fields in both spec and batch areas

- [ ] **Mobile Optimizations**
  - Larger tap targets
  - Swipe gestures for Quick Count
  - Haptic feedback

- [ ] **Low Stock Alerts**
  - Banner or notification when items fall below threshold

- [ ] **Better Error Feedback**
  - More user-friendly error messages and recovery options

## Analytics & Reporting
- [ ] **Prep Analytics**
  - Show daily/weekly prep logs and trends (from `prepLogs`)