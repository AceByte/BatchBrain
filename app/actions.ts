"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Manually set a premix's stock. Records the change in stock_adjustment_logs.
export async function adjustStock(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const newValue = Number(formData.get("new_value"))
  const reason = String(formData.get("reason") || "manual")

  const current = await sql`
    SELECT name, current_bottles::float8 AS current_bottles
    FROM premixes WHERE premix_id = ${premixId}
  `
  if (current.length === 0) return
  const oldValue = current[0].current_bottles as number
  const name = current[0].name as string

  await sql`
    UPDATE premixes
    SET current_bottles = ${newValue}, updated_at = now()
    WHERE premix_id = ${premixId}
  `
  await sql`
    INSERT INTO stock_adjustment_logs
      (premix_id, premix_name, old_value, new_value, delta, reason, created_at)
    VALUES
      (${premixId}, ${name}, ${oldValue}, ${newValue}, ${newValue - oldValue}, ${reason}, now())
  `
  revalidatePath("/")
}

// Log a production batch: adds produced bottles to stock and records the log.
export async function logProduction(formData: FormData) {
  const premixId = String(formData.get("premix_id"))
  const produced = Number(formData.get("produced_bottles"))
  const notes = String(formData.get("notes") || "")
  if (!produced) return

  await sql`
    UPDATE premixes
    SET current_bottles = current_bottles + ${produced}, updated_at = now()
    WHERE premix_id = ${premixId}
  `
  await sql`
    INSERT INTO production_logs
      (premix_id, produced_bottles, production_date, notes, logged_at)
    VALUES
      (${premixId}, ${produced}, current_date, ${notes}, now())
  `
  revalidatePath("/")
}
