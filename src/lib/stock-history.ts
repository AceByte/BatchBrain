import { sql } from "@/lib/legacy-db";

export type StockAdjustment = {
  id: number;
  cocktailId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  delta: number;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
};

export async function logStockAdjustment(params: {
  cocktailId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  reason?: string;
  notes?: string;
}): Promise<void> {
  const delta = params.newValue - params.oldValue;
  
  await sql`
    INSERT INTO stock_adjustment_history 
      (cocktail_id, premix_name, old_value, new_value, delta, reason, notes)
    VALUES 
      (${params.cocktailId}, ${params.premixName}, ${params.oldValue}, 
       ${params.newValue}, ${delta}, ${params.reason || null}, ${params.notes || null})
  `;
}

export async function getStockAdjustmentHistory(
  cocktailId?: string,
  limit: number = 100
): Promise<StockAdjustment[]> {
  const rows = (cocktailId
    ? await sql`
        SELECT id, cocktail_id, premix_name, old_value, new_value, delta, reason, notes, created_at
        FROM stock_adjustment_history
        WHERE cocktail_id = ${cocktailId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, cocktail_id, premix_name, old_value, new_value, delta, reason, notes, created_at
        FROM stock_adjustment_history
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    cocktailId: row.cocktail_id,
    premixName: row.premix_name,
    oldValue: Number(row.old_value),
    newValue: Number(row.new_value),
    delta: Number(row.delta),
    reason: row.reason,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  }));
}
