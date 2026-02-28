# BatchBrain

A comprehensive bar inventory and batch production management system for cocktail premixes.

## 🚀 Features

### Core Functionality
- **Premix Inventory Management** - Track current stock levels with color-coded urgency indicators
- **Cocktail Specifications** - Complete cocktail specs including glassware, technique, garnish, and serve extras
- **Batch Recipes** - Ingredient lists for premix production
- **Weekly Prep Planning** - Automated calculations for batch production needs

### 📊 Advanced Features (Recently Added)

#### Configuration System
- Customizable threshold and target days
- Configurable weekly usage forecasts
- Alert preferences and UI settings
- Accessible via Settings page (`/settings`)

#### Production Logging
- Log batch production with notes
- Automatic inventory updates
- Production history tracking
- Historical data used for dynamic weekly usage calculations

#### Stock Management
- **Quick Adjustments**: ±1 and ±5 buttons for fast updates
- **Custom Input**: Direct numeric entry for exact values
- **Bulk Operations**: Select multiple premixes and apply adjustments to all
- **Draft Mode**: Changes staged until you save (with auto-discard confirmation)
- **Adjustment History**: Full audit trail with reasons and notes
- **Keyboard Shortcuts**: 
  - `Ctrl+S` to save pending changes
  - `Esc` to discard (with confirmation)

#### Analytics & Reporting
- Production history with timeframe filters (7/30/90/365 days)
- Stock adjustment history with reasons
- Summary statistics and trends
- CSV export for external analysis
- Accessible via Analytics page (`/analytics`)

#### UI/UX Improvements
- **Refresh Button**: Manual data reload with timestamp
- **Last Updated**: Shows when data was last refreshed
- **Reason/Notes**: Add context to stock adjustments
- **Collapsible Sections**: Hide/show sections to focus on what matters
- **Search & Filter**: Find cocktails by name or ingredient; filter by category
- **Sorting**: Sort premixes by urgency, name, or stock level
- **Print Support**: Optimized print styles for prep lists
- **Quick Stats**: Dashboard cards showing total premixes, cocktails, batches needed, and low stock items

### 🗄️ Database Tables
- `cocktails` - Cocktail details and categorization
- `cocktail_specs` - Ingredient specifications per cocktail
- `batch_recipes` - Premix batch recipes
- `inventory` - Current stock levels and thresholds
- `prep_logs` - Production history (with notes)
- `stock_adjustment_history` - Audit trail for inventory changes
- `config` - Application configuration settings

## 🛠️ Tech Stack
- **Framework**: Next.js 16.1.6 (App Router) with React 19
- **Database**: PostgreSQL on Neon (serverless)
- **Database Driver**: @neondatabase/serverless
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript

## 📦 Setup

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔑 Environment Variables
```.env
DATABASE_URL="postgresql://..." # Neon PostgreSQL connection string
```

## 📱 Pages
- `/` - Main dashboard
- `/settings` - Configuration and preferences
- `/analytics` - Production and adjustment history with export

## 🎯 Workflow

1. **Monitor** - Check dashboard for low stock alerts
2. **Plan** - Review weekly prep plan for batches needed
3. **Produce** - Use "Log Production" to record batch completion
4. **Adjust** - Make manual stock adjustments with reasons
5. **Analyze** - View trends and export data in Analytics

## 🔄 Data Flow
- Config settings control thresholds and forecasts
- Production logs feed into weekly usage calculations
- Weekly usage drives prep plan recommendations
- Stock adjustments are tracked with full audit trail
- All changes are saved with contextual reasons/notes

## 🎨 Color Coding
- 🔴 **Critical** - Below 50% of threshold (red)
- 🟡 **Low** - Below threshold (amber)  
- ✅ **OK** - Above threshold (green)
- ✏️ **Modified** - Has pending unsaved changes (blue highlight)

## 📋 Keyboard Shortcuts
- `Ctrl+S` / `Cmd+S` - Save pending changes
- `Esc` - Discard pending changes (with confirmation)
- `F5` - Refresh data

---

**BatchBrain** • Built for professional bar operations • © 2026

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
- Add editable forms for adding or editing cocktails, premixes, and recipes
- Add historical analytics charting from `StockEvent`

check [Todo.md]

# Developed by Bertram B. Bischoff