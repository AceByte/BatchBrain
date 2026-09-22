# BatchBrain roadmap

Last reviewed: 2026-09-22. `npm run lint`, `npm test`, and `npm run build` pass. The Neon database was inspected read-only: live and archived cocktail data has no detected orphans, overlaps, duplicate names, or invalid stock targets.

## Completed

- [x] Make cocktail archive and restore operations transactional.
- [x] Make premix/cocktail recipe replacement transactional.
- [x] Validate stock inputs, round bottle values to two decimals, and prevent `threshold_bottles > target_bottles` in both the UI and server actions.
- [x] Detect friendly slug collisions before creating cocktails or premixes.
- [x] Replace silent stock-action failures with actionable errors; inline stock forms now also show saving, success, and error states.
- [x] Move shared rules into `lib/business-rules.ts`; add unit coverage for slug normalization, rounding, stock validation, and depletion/runway calculations.
- [x] Use `NULLS FIRST` for zero-target premixes in analytics.
- [x] Remove the placeholder database URL; a missing `DATABASE_URL` now fails clearly on the first database operation while remaining compatible with `next build`.
- [x] Pin dependency versions and remove unused `sharp` script configuration.
- [x] Replace unstable ingredient-row index keys and add Escape/focus-trap behavior to edit modals.
- [x] Extract duplicate stock action controls into `StockActionForms` for both grid and table views.

## Next: correctness and operations

- [x] **Model premix yield explicitly.** Added `bottles_per_batch` to Neon and premix editing (default: 1 bottle), then calculate `batchesNeeded = ceil((target - current) / bottles_per_batch)` consistently in both per-premix and combined production plans. Set the real yield for each premix in the edit screen; existing data deliberately remains at the conservative default until reviewed.
- [x] **Add feedback and existence checks for archive/restore.** Archive/restore now provide saving, success, and error feedback; archive, restore, and edit actions explicitly reject missing records.
- [x] **Handle uniqueness races.** Create actions translate Postgres unique-constraint races into the same friendly “name already exists” message.
- [x] **Clarify runway data semantics.** Analytics now states that runway comes from negative manual adjustments during the previous 30 days.

## Quality and maintainability
- [x] **Finish the stock-browser decomposition.** `StockGrid`, `StockTable`, and `ProductionPlan` are now focused components; `stock-browser.tsx` owns only filtering, view state, and modal orchestration.
- [ ] **Add action/integration tests.** Current unit tests cover pure rules. Add tests with a disposable test database for transaction rollback, archive/restore round trips, duplicate-name races, and failed recipe inserts.
- [x] **Repair linting.** `npm run lint` invokes ESLint directly with a flat configuration, and CI now runs lint, tests, and the production build.
- [x] **Add CI.** GitHub Actions runs lint, tests, and the production build on pull requests and pushes to `main`.
- [x] **Add README and LICENSE.** Added setup, database, yield, and analytics documentation plus an MIT license.

## Product improvements

- [x] Add production-batch yield and an optional batch date/notes workflow; production logging now captures the produced quantity, optional batch date, and operator notes while defaulting the date safely for older callers.
- [ ] Add a stock history view per premix, with filters and reversible adjustments/audit metadata (who changed what and why). History, filters, reason/notes capture, and append-only undo are now in place; actor identity still requires authentication/audit design.
- [x] Add confirmation and undo affordances for archive/restore and destructive recipe changes. Archive/restore now confirm; recipe-line replacement prompts only when lines actually change; stock adjustments have append-only undo.
- [x] Normalize ingredient names for analytics and combined production totals by trimming whitespace and grouping names/units case-insensitively. A full ingredient catalog remains a future enhancement.
- [x] Consider an offline queue or read-only offline state. Offline mode now clearly warns that cached pages may be stale and stock writes require a connection; writes remain intentionally unqueued.
- [x] Add an empty-state/onboarding flow for a new venue: an empty stock view now guides the operator through targets, thresholds, units, and first recipe setup.
- [x] Add a preparation deadline for a premix; due, under-target premixes now appear in the production plan and show their deadline.
- [x] Add explicit ingredient alias management; aliases map recipe wording to canonical purchasing names without rewriting source recipes.
- [x] Add operational reporting exports for inventory, stock history, and cocktail specs as CSV.
- [x] Rework spec-sheet printing to match the Cocktail Bible reference: portrait A4, centered title, six-column bordered table, stacked ingredients, and print-only layout.

## Notes
- Tagged-template database queries are parameterized correctly.
- Parallel read queries in `getAnalytics` and page loaders are appropriate for the current data size.
- Recipe-item database IDs still change when a recipe is saved because the current transactional approach replaces all lines. This is acceptable while no other records reference those IDs; preserve/update lines by ID only if that relationship is introduced.
- The Neon schema now has `premixes.bottles_per_batch` for batch yield, `premixes.prep_deadline`, and `stock_adjustment_logs.reversal_of_id` with a unique partial index and restrictive foreign key; the migration is non-destructive and idempotent.
- The Neon schema also has an `ingredient_aliases` table with non-empty validation; alias changes are reversible and do not mutate recipe text.
