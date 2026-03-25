import { sql } from "@/lib/legacy-db";

export type PrepLog = {
  id: number;
  date: string;
  cocktailId: string;
  cocktailName: string;
  amount: number;
  timestamp: Date;
  notes?: string;
};

export async function logProduction(params: {
  cocktailId: string;
  amount: number;
  date?: string;
  notes?: string;
}): Promise<void> {
  const date = params.date || new Date().toISOString().split("T")[0];
  
  await sql`
    INSERT INTO production_logs (premix_id, produced_bottles, production_date, logged_at, notes)
    VALUES (${params.cocktailId}, ${params.amount}, ${date}, NOW(), ${params.notes || null})
  `;
  
  // Update inventory count
  await sql`
    UPDATE premixes
    SET current_bottles = current_bottles + ${params.amount}, updated_at = NOW()
    WHERE premix_id = ${params.cocktailId}
  `;
}

export async function getProductionHistory(
  cocktailId?: string,
  limit: number = 100,
  days?: number
): Promise<PrepLog[]> {
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
          SELECT p.id, p.production_date, p.premix_id, p.produced_bottles, p.logged_at, p.notes, pm.name as premix_name
          FROM production_logs p
          LEFT JOIN premixes pm ON p.premix_id = pm.premix_id
          WHERE p.premix_id = ${cocktailId} AND p.logged_at >= ${cutoffDate.toISOString()}
          ORDER BY p.logged_at DESC
          LIMIT ${limit}
        `
      : cocktailId
        ? await sql`
            SELECT p.id, p.production_date, p.premix_id, p.produced_bottles, p.logged_at, p.notes, pm.name as premix_name
            FROM production_logs p
            LEFT JOIN premixes pm ON p.premix_id = pm.premix_id
            WHERE p.premix_id = ${cocktailId}
            ORDER BY p.logged_at DESC
            LIMIT ${limit}
          `
        : cutoffDate
          ? await sql`
              SELECT p.id, p.production_date, p.premix_id, p.produced_bottles, p.logged_at, p.notes, pm.name as premix_name
              FROM production_logs p
              LEFT JOIN premixes pm ON p.premix_id = pm.premix_id
              WHERE p.logged_at >= ${cutoffDate.toISOString()}
              ORDER BY p.logged_at DESC
              LIMIT ${limit}
            `
          : await sql`
              SELECT p.id, p.production_date, p.premix_id, p.produced_bottles, p.logged_at, p.notes, pm.name as premix_name
              FROM production_logs p
              LEFT JOIN premixes pm ON p.premix_id = pm.premix_id
              ORDER BY p.logged_at DESC
              LIMIT ${limit}
            `
  ) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    date: row.production_date,
    cocktailId: row.premix_id,
    cocktailName: row.premix_name || "Unknown",
    amount: Number(row.produced_bottles),
    timestamp: new Date(row.logged_at),
    notes: row.notes,
  }));
}

export async function getWeeklyUsage(
  weeksBack: number = 4
): Promise<Map<string, number>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);
  
  const rows = await sql`
    SELECT premix_id, SUM(produced_bottles) as total_amount
    FROM production_logs
    WHERE logged_at >= ${cutoffDate.toISOString()}
    GROUP BY premix_id
  ` as any[];
  
  const weeklyUsage = new Map<string, number>();
  for (const row of rows) {
    const avgPerWeek = Number(row.total_amount) / weeksBack;
    weeklyUsage.set(row.premix_id, avgPerWeek);
  }
  
  return weeklyUsage;
}
