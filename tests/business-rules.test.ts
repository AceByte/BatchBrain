import assert from "node:assert/strict"
import test from "node:test"
import { getDepletionMetrics, roundBottles, slugify, validatePremixStock, validateProductionDate } from "../lib/business-rules.ts"

test("slugify normalizes names that would otherwise collide", () => {
  assert.equal(slugify("Mango Mule"), "mango-mule")
  assert.equal(slugify("Mango, Mule!"), "mango-mule")
  assert.equal(slugify("   "), "")
})

test("roundBottles avoids floating-point display and storage artefacts", () => {
  assert.equal(roundBottles(3.0000000000000004), 3)
  assert.equal(roundBottles(1.005), 1)
  assert.equal(roundBottles(1.006), 1.01)
})

test("validatePremixStock accepts valid thresholds and rejects invalid ones", () => {
  assert.doesNotThrow(() => validatePremixStock(6, 2))
  assert.throws(() => validatePremixStock(2, 6), /cannot exceed/)
  assert.throws(() => validatePremixStock(-1, 0), /cannot be negative/)
})

test("getDepletionMetrics calculates 30-day usage and remaining days", () => {
  assert.deepEqual(getDepletionMetrics(6, -30), { avgDailyUse: 1, daysRemaining: 6 })
  assert.deepEqual(getDepletionMetrics(3, -15), { avgDailyUse: 0.5, daysRemaining: 6 })
  assert.deepEqual(getDepletionMetrics(6, 0), { avgDailyUse: 0, daysRemaining: null })
})

test("validateProductionDate accepts ISO calendar dates and rejects impossible dates", () => {
  assert.equal(validateProductionDate("2026-09-22"), "2026-09-22")
  assert.throws(() => validateProductionDate("2026-02-30"), /valid calendar date/)
  assert.throws(() => validateProductionDate("22-09-2026"), /valid calendar date/)
})
