## Correctness / data-integrity (the ones I'd actually fix first)

**`archiveCocktail` / `restoreCocktail` aren't transactional.** Each is 6 sequential `sql` calls (copy → copy → copy → delete → delete → delete). If the connection drops or a query fails midway, you can end up with a cocktail duplicated in both tables, or specs deleted from the live table while the cocktail row still exists. Neon's serverless driver supports `sql.transaction([...])` — this is exactly the case for it.

**`updatePremix` / `updateCocktailSpec` do delete-all-then-reinsert for line items, not transactional either.** Same failure mode: delete succeeds, one insert in the loop throws (e.g. a bad value), and you're left with an empty ingredient list for that premix. This also means recipe-item `id`s change on every save — if anything ever keys off `RecipeItem.id` across renders/edits, that's a latent bug.

**`slugify` collisions aren't checked.** "Mango Mule" and "Mango, Mule!" both slug to `mango-mule`. `createPremix`/`createCocktail` don't check for an existing id before insert, so a collision surfaces as a raw Postgres unique-constraint error instead of a friendly "name already exists."

**Silent failures everywhere in `actions.ts`.** `if (current.length === 0) return`, `if (!produced) return` — these fail with zero feedback to the user. From the UI side there's no error state at all (no try/catch, no toast, nothing), so a mistyped premix_id or a DB hiccup just looks like the button did nothing.

**`ORDER BY (current_bottles / NULLIF(target_bottles, 0)) ASC` in the stock-health query**: any premix with `target_bottles = 0` produces `NULL`, and Postgres sorts `NULL` last in `ASC` by default — so items with no target get pushed to the bottom of a "what needs attention" list regardless of actual stock level. Probably not what you want.

## Robustness

- `lib/db.ts` falls back to a fake `postgres://placeholder:...` connection string when `DATABASE_URL` is unset. That lets the app boot and fail confusingly later instead of erroring clearly at startup.
- Every query result is cast with `as Premix[]` etc. with no runtime validation. If a column gets renamed or a migration lags behind, you get silent type lies instead of a caught error.
- `package.json` pins `next`, `react`, `react-dom`, and `@neondatabase/serverless` to `"latest"`. You have a lockfile, so `npm ci` is fine, but any manual `npm install` will grab whatever shipped that day — worth pinning real versions.
- Floating-point display: bottle amounts use `step="0.01"` and plain arithmetic (`current_bottles + produced`, `amount_per_batch * bottlesNeeded`) with no rounding on display or write. You will eventually see a stock value like `3.0000000000000004` render in the UI.

## Component-level nitpicks

- `stock-browser.tsx` is 442 lines doing search, filtering, the production plan, grid view, table view, and modal orchestration. The grid and table views duplicate near-identical `<form action={adjustStock}>`/`<form action={logProduction}>` blocks — pull that into one `<StockActionForms premix={p} />` component.
- In `edit-premix-modal.tsx`, ingredient rows use `key={idx}` while rows are addable/removable. Index keys plus removable rows is a classic source of input-focus/value mismatch bugs in React — use a generated id (`crypto.randomUUID()`) per row instead.
- The modal closes on backdrop click but has no Escape-key handler and doesn't trap focus — you can tab out into the page behind it.
- Nothing stops `threshold_bottles > target_bottles` in the edit form — a logically invalid state that the UI will happily render.

## Repo hygiene

- No README, no LICENSE.
- `"allowScripts": { "sharp@0.34.5": true }` in `package.json`, but `sharp` isn't a dependency anywhere — dead config, safe to remove.
- No test script at all. Given this app manages real inventory numbers, the `slugify` collision logic and the `avgDailyUse`/`daysRemaining` math in `getAnalytics` are exactly the kind of pure functions that are cheap to unit test and easy to silently break.

What isn't wrong: the tagged-template `sql` usage throughout is properly parameterized (no injection risk), `Promise.all` is used well in `getAnalytics`, and the code is generally readable and consistently styled. The issues above are mostly about transactional safety, error visibility, and splitting up the one big component — not fundamental design problems.