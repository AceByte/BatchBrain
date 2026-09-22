export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function roundBottles(value: number) {
  return Math.round(value * 100) / 100
}

export function validatePremixStock(targetBottles: number, thresholdBottles: number) {
  if (!Number.isFinite(targetBottles) || !Number.isFinite(thresholdBottles)) {
    throw new Error("Target stock and minimum threshold must be valid numbers.")
  }
  if (targetBottles < 0 || thresholdBottles < 0) {
    throw new Error("Stock targets cannot be negative.")
  }
  if (thresholdBottles > targetBottles) {
    throw new Error("Minimum threshold cannot exceed target stock.")
  }
}

export function validateProductionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Production date must be a valid calendar date.")
  }
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Production date must be a valid calendar date.")
  }
  return value
}

export function getDepletionMetrics(currentBottles: number, netDeltaLast30Days: number) {
  const avgDailyUse = netDeltaLast30Days < 0 ? Math.abs(netDeltaLast30Days) / 30 : 0
  const daysRemaining = avgDailyUse > 0 ? Math.round(currentBottles / avgDailyUse) : null
  return { avgDailyUse, daysRemaining }
}
