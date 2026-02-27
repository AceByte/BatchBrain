# BatchBrain

BatchBrain is a React + TypeScript single-page app built on Next.js for:

- Premix inventory tracking
- Cocktail specsheet management (regular, seasonal, signature)
- Weekly prep planning (what to batch, how many batches, and ingredients required)

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Neon)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Add your Neon connection string to `.env`:

```env
DATABASE_URL="postgresql://..."
```

3. Push schema to your database:

```bash
npm run db:push
```

4. Seed starter data:

```bash
npm run db:seed
```

5. Start development server:

```bash
npm run dev
```

Then open http://localhost:3000.

## Current MVP Features

- `Premix inventory`: current liters, threshold, target, and quick +/- adjustments
- `Cocktail specsheet`: cocktail categories with weekly forecast and premix requirements
- `Prep list`: algorithmic batching plan based on projected weekly usage and thresholds
- `Ingredient totals`: rolled-up ingredients needed for all required batches

## API Endpoints

- `GET /api/dashboard` → all dashboard data in one payload
- `PATCH /api/premix/:id/adjust` → adjust stock and log a stock event

## Suggested Next Steps

- Add auth and role permissions
- Add editable forms for cocktails, premixes, and recipes
- Add historical analytics charting from `StockEvent`
- Add unit tests for prep-planning logic
