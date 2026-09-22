# BatchBrain

BatchBrain manages cocktail specifications, premix inventory, production planning, and archived recipes.

## Local setup

1. Install Node.js 24 or newer.
2. Run `npm ci`.
3. Create `.env.local` with `DATABASE_URL` set to the Neon PostgreSQL connection string.
4. Run `npm run dev`.

Useful commands:

- `npm test` runs business-rule tests.
- `npm run build` runs the production build and TypeScript checks.

## Premix yields

Each premix has a **Bottles per Batch** value. Production plans calculate the required full batches as `ceil(bottles needed / bottles per batch)`. Existing premixes default to one bottle per batch; set the real yield for each premix in the edit screen before relying on purchasing totals.

When logging production, enter the actual bottles produced. The batch date defaults to today but can be backdated, and optional notes can record useful operator context.

Premixes can also have an optional **Prepare by** deadline. Under-target premixes whose deadline has arrived are included in the production plan even when they have not crossed the normal stock threshold.

## Database

The app requires the tables used in `lib/queries.ts` and `app/actions.ts`. Production uses Neon PostgreSQL. The database is not seeded automatically; never commit `.env.local` or connection credentials.

The checked-in `scripts/migrate-audit-history.sql` migration is non-destructive and idempotent. It preserves the existing `premixes.bottles_per_batch` batch-yield field and adds the `stock_adjustment_logs.reversal_of_id` link used for append-only undo history.

## Analytics note

Runway is currently estimated from negative manual stock adjustments recorded during the previous 30 days. It is not a sales/consumption forecast until consumption logging is introduced.

Ingredient demand and combined production totals group names and units case-insensitively after trimming whitespace. This reduces accidental purchasing fragmentation while keeping the original recipe text visible in edit screens.

Analytics includes an explicit ingredient-alias manager for mapping operational variants to canonical purchasing names. Inventory, stock history, and cocktail specs can be exported as CSV from their respective screens.
