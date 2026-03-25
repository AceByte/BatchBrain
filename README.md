# BatchBrain

Premix inventory, cocktail specs, and weekly prep planning — built for professional bar operations.

## ✨ What it does
- **Inventory**: track premix stock with urgency color states and quick adjustments
- **Spec Sheet**: manage cocktail specs (regular/seasonal/signature) and batched vs. non-batched recipes
- **Prep Planning**: automatically calculates what to batch and the ingredient totals needed
- **Logging & Audit Trail**: production logs + stock adjustment history (notes)
- **Analytics**: production and stock history with CSV export
- **Print Reports**: generate printer-friendly reports (specs, prep plans, inventory snapshots, changelog) with configurable paper sizes and scaling

## 🧱 Tech Stack
- Next.js 16.1.6 (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL (Neon) via `@neondatabase/serverless`
- Prisma ORM

## 🗂️ Pages
- `/` — Dashboard (Inventory / Prep / Spec Sheet)
- `/analytics` — Production + stock adjustment history (CSV export)
- `/print` — Generate and preview printer-friendly reports (specs, prep plans, inventory, changelog)
- `/settings` — Configuration (currently disabled and redirects to `/`)

## 🚦 Status colors
- 🔴 **Critical** — below 50% of threshold
- 🟡 **Low** — below threshold
- ✅ **OK** — above threshold
- ✏️ **Modified** — pending unsaved changes

## ⌨️ Keyboard shortcuts
- `Ctrl+S` / `Cmd+S` — save pending changes
- `Esc` — discard pending changes (with confirmation)
- `F5` — refresh data

## 🖨️ Print Features
- Multiple report types: cocktail specs, prep specs, inventory snapshot, change log, combined
- Paper sizes: A3, A4, Letter, Legal, A5
- Scale options: 80%, 90%, 100%, 110%, 120%
- Mobile-responsive design with fit-to-screen preview
- Live preview with exact print layout matching

## 🔄 Data flow (high level)
- Config controls thresholds and forecasts
- Production logs feed weekly usage calculations
- Weekly usage drives prep plan recommendations
- Stock adjustments are saved with contextual notes

## 📦 Quickstart

```bash
npm install
npm run dev
```

### Environment Setup
Create a `.env.local` file in the root directory:
```
DATABASE_URL=your_neon_database_url_here
```

Open:
- http://localhost:3000

## 🔑 Environment variables
Create a `.env` file:

```env
DATABASE_URL="postgresql://..." # Neon PostgreSQL connection string
```

## 🛠️ Scripts
- `npm run dev` — start the dev server
- `npm run db:push` — push Prisma schema to the database
- `npm run db:seed` — seed starter data

## 🔌 API endpoints
- `GET /api/dashboard` — all dashboard data in one payload
- `PATCH /api/premix/:id/adjust` — adjust stock and log a stock event

## 🗺️ Roadmap
See `Todo.md`.

---

**BatchBrain** • © 2026