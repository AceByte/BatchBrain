import { sql } from "@/lib/legacy-db";

export type AppConfig = {
  defaultThresholdDays: number;
  defaultTargetDays: number;
  defaultWeeklyDrinksPerCocktail: number;
  enableLowStockAlerts: boolean;
  enableBrowserNotifications: boolean;
  darkMode: boolean;
  autoSaveDrafts: boolean;
  productionLeadTimeDays: number;
};

const DEFAULT_CONFIG: AppConfig = {
  defaultThresholdDays: 3,
  defaultTargetDays: 7,
  defaultWeeklyDrinksPerCocktail: 10,
  enableLowStockAlerts: true,
  enableBrowserNotifications: false,
  darkMode: false,
  autoSaveDrafts: true,
  productionLeadTimeDays: 1,
};

export async function getConfig(): Promise<AppConfig> {
  try {
    const rows = await sql`SELECT key, value FROM config` as Array<{ key: string; value: any }>;
    
    const config: Partial<AppConfig> = {};
    for (const row of rows) {
      const key = row.key as keyof AppConfig;
      config[key] = row.value as any;
    }
    
    // Merge with defaults for any missing keys
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Error loading config:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    await sql`
      INSERT INTO config (key, value)
      VALUES (${key}, ${JSON.stringify(value)})
      ON CONFLICT (key)
      DO UPDATE SET value = ${JSON.stringify(value)}
    `;
  }
}

export async function resetConfig(): Promise<void> {
  await sql`DELETE FROM config`;
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await sql`INSERT INTO config (key, value) VALUES (${key}, ${JSON.stringify(value)})`;
  }
}
