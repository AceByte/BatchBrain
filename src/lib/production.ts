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
    INSERT INTO prep_logs (date, cocktail_id, amount, "Time", notes)
    VALUES (${date}, ${params.cocktailId}, ${params.amount}, NOW(), ${params.notes || null})
  `;
  
  // Update inventory count
  await sql`
    UPDATE inventory
    SET count = count + ${params.amount}
    WHERE "cocktailId" = ${params.cocktailId}
  `;
}

export async function getProductionHistory(
  cocktailId?: string,
  limit: number = 100
): Promise<PrepLog[]> {
  const rows = (cocktailId
    ? await sql`
        SELECT p.id, p.date, p.cocktail_id, p.amount, p."Time", p.notes, i.name as cocktail_name
        FROM prep_logs p
        LEFT JOIN inventory i ON p.cocktail_id = i."cocktailId"
        WHERE p.cocktail_id = ${cocktailId}
        ORDER BY p."Time" DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT p.id, p.date, p.cocktail_id, p.amount, p."Time", p.notes, i.name as cocktail_name
        FROM prep_logs p
        LEFT JOIN inventory i ON p.cocktail_id = i."cocktailId"
        ORDER BY p."Time" DESC
        LIMIT ${limit}
      `) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    date: row.date,
    cocktailId: row.cocktail_id,
    cocktailName: row.cocktail_name || "Unknown",
    amount: Number(row.amount),
    timestamp: new Date(row.Time),
    notes: row.notes,
  }));
}

export async function getWeeklyUsage(
  weeksBack: number = 4
): Promise<Map<string, number>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);
  
  const rows = await sql`
    SELECT cocktail_id, SUM(amount) as total_amount
    FROM prep_logs
    WHERE "Time" >= ${cutoffDate.toISOString()}
    GROUP BY cocktail_id
  ` as any[];
  
  const weeklyUsage = new Map<string, number>();
  for (const row of rows) {
    const avgPerWeek = Number(row.total_amount) / weeksBack;
    weeklyUsage.set(row.cocktail_id, avgPerWeek);
  }
  
  return weeklyUsage;
}
