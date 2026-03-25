import { sql } from "@/lib/legacy-db";

export type StockAdjustment = {
  id: number;
  cocktailId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  delta: number;
  notes: string | null;
  createdAt: Date;
};

export async function logStockAdjustment(params: {
  cocktailId: string;
  premixName: string;
  oldValue: number;
  newValue: number;
  notes?: string;
}): Promise<void> {
  const delta = params.newValue - params.oldValue;
  
  await sql`
    INSERT INTO stock_adjustment_logs
      (premix_id, premix_name, old_value, new_value, delta, notes)
    VALUES 
      (${params.cocktailId}, ${params.premixName}, ${params.oldValue}, 
       ${params.newValue}, ${delta}, ${params.notes || null})
  `;
}

export async function getStockAdjustmentHistory(
  cocktailId?: string,
  limit: number = 100,
  days?: number
): Promise<StockAdjustment[]> {
  const safeDays =
    typeof days === "number" && Number.isFinite(days) && days > 0
      ? Math.floor(days)
      : undefined;
  const cutoffDate = safeDays
    ? new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000)
    : null;

  const rows = (
    cocktailId && cutoffDate
      ? await sql`
          SELECT id, premix_id, premix_name, old_value, new_value, delta, notes, created_at
          FROM stock_adjustment_logs
          WHERE premix_id = ${cocktailId} AND created_at >= ${cutoffDate.toISOString()}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : cocktailId
        ? await sql`
            SELECT id, premix_id, premix_name, old_value, new_value, delta, notes, created_at
            FROM stock_adjustment_logs
            WHERE premix_id = ${cocktailId}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : cutoffDate
          ? await sql`
              SELECT id, premix_id, premix_name, old_value, new_value, delta, notes, created_at
              FROM stock_adjustment_logs
              WHERE created_at >= ${cutoffDate.toISOString()}
              ORDER BY created_at DESC
              LIMIT ${limit}
            `
          : await sql`
              SELECT id, premix_id, premix_name, old_value, new_value, delta, notes, created_at
              FROM stock_adjustment_logs
              ORDER BY created_at DESC
              LIMIT ${limit}
            `
  ) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    cocktailId: row.premix_id,
    premixName: row.premix_name,
    oldValue: Number(row.old_value),
    newValue: Number(row.new_value),
    delta: Number(row.delta),
    notes: row.notes,
    createdAt: new Date(row.created_at),
  }));
}
