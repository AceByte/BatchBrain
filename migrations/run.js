require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Migration 001: Create stock_adjustment_history table
    await sql`
      CREATE TABLE IF NOT EXISTS stock_adjustment_history (
        id SERIAL PRIMARY KEY,
        cocktail_id TEXT NOT NULL,
        premix_name TEXT NOT NULL,
        old_value REAL NOT NULL,
        new_value REAL NOT NULL,  
        delta REAL NOT NULL,
        reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✓ Migration 001: stock_adjustment_history table created');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_stock_adj_cocktail ON stock_adjustment_history(cocktail_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stock_adj_created ON stock_adjustment_history(created_at DESC)`;
    console.log('✓ Migration 001: Indexes created');
    
    // Migration 002: Add notes column to prep_logs (if table exists)
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'prep_logs'
        ) THEN
          ALTER TABLE prep_logs ADD COLUMN IF NOT EXISTS notes TEXT;
          CREATE INDEX IF NOT EXISTS idx_prep_logs_time ON prep_logs("Time" DESC);
          CREATE INDEX IF NOT EXISTS idx_prep_logs_cocktail ON prep_logs(cocktail_id);
        END IF;
      END
      $$
    `;
    console.log('✓ Migration 002: prep_logs updated (if table exists)');

    // Migration 003: Fix batch_recipes table keying and dedupe rows
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'batch_recipes'
        ) THEN
          DELETE FROM batch_recipes b
          USING (
            SELECT ctid,
                   ROW_NUMBER() OVER (
                     PARTITION BY cocktail_id, ingredient, parts
                     ORDER BY ctid
                   ) AS rn
            FROM batch_recipes
          ) duplicates
          WHERE b.ctid = duplicates.ctid
            AND duplicates.rn > 1;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'batch_recipes'
              AND column_name = 'id'
          ) THEN
            ALTER TABLE batch_recipes ADD COLUMN id BIGSERIAL;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'batch_recipes'
              AND constraint_type = 'PRIMARY KEY'
          ) THEN
            ALTER TABLE batch_recipes ADD CONSTRAINT batch_recipes_pkey PRIMARY KEY (id);
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'batch_recipes'
              AND constraint_name = 'batch_recipes_unique_item'
          ) THEN
            ALTER TABLE batch_recipes ADD CONSTRAINT batch_recipes_unique_item UNIQUE (cocktail_id, ingredient);
          END IF;
        END IF;
      END
      $$;
    `;
    console.log('✓ Migration 003: batch_recipes deduped and primary key added');
    
    // Migration 004: Create cocktail_premix_spec table
    await sql`
      CREATE TABLE IF NOT EXISTS cocktail_premix_spec (
        id SERIAL PRIMARY KEY,
        cocktail_id TEXT NOT NULL UNIQUE,
        premix_note TEXT,
        batch_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✓ Migration 004: cocktail_premix_spec table created');
    
    await sql`CREATE INDEX IF NOT EXISTS idx_cocktail_premix_spec_cocktail_id ON cocktail_premix_spec(cocktail_id)`;
    console.log('✓ Migration 004: Indexes created');
    
    console.log('✓ All migrations complete!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
