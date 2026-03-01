// This file is deprecated. The prep planning logic has been moved to dashboard-data.ts
// and now uses the refactored schema with bottles instead of liters.
// Keeping this file for reference only.

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

