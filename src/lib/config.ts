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
  archivedPremixIds: string[];
  archivedCocktailIds: string[];
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
  archivedPremixIds: [],
  archivedCocktailIds: [],
};

export async function getConfig(): Promise<AppConfig> {
  try {
    const rows = (await sql`SELECT key, value FROM app_config`) as Array<{
      key: keyof AppConfig;
      value: AppConfig[keyof AppConfig];
    }>;
    
    const config: AppConfig = { ...DEFAULT_CONFIG };
    for (const row of rows) {
      switch (row.key) {
        case "defaultThresholdDays":
          config.defaultThresholdDays = Number(row.value);
          break;
        case "defaultTargetDays":
          config.defaultTargetDays = Number(row.value);
          break;
        case "defaultWeeklyDrinksPerCocktail":
          config.defaultWeeklyDrinksPerCocktail = Number(row.value);
          break;
        case "enableLowStockAlerts":
          config.enableLowStockAlerts = Boolean(row.value);
          break;
        case "enableBrowserNotifications":
          config.enableBrowserNotifications = Boolean(row.value);
          break;
        case "darkMode":
          config.darkMode = Boolean(row.value);
          break;
        case "autoSaveDrafts":
          config.autoSaveDrafts = Boolean(row.value);
          break;
        case "productionLeadTimeDays":
          config.productionLeadTimeDays = Number(row.value);
          break;
        case "archivedPremixIds":
          config.archivedPremixIds = Array.isArray(row.value) ? (row.value as string[]) : [];
          break;
        case "archivedCocktailIds":
          config.archivedCocktailIds = Array.isArray(row.value) ? (row.value as string[]) : [];
          break;
      }
    }
    
    // Merge with defaults for any missing keys
    return config;
  } catch (error) {
    console.error("Error loading config:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    await sql`
      INSERT INTO app_config (key, value)
      VALUES (${key}, ${JSON.stringify(value)})
      ON CONFLICT (key)
      DO UPDATE SET value = ${JSON.stringify(value)}
    `;
  }
}

export async function resetConfig(): Promise<void> {
  await sql`DELETE FROM app_config`;
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await sql`INSERT INTO app_config (key, value) VALUES (${key}, ${JSON.stringify(value)})`;
  }
}
