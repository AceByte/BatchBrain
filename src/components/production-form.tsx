"use client";

import { useState } from "react";

type ProductionFormProps = {
  premixes: Array<{ id: string; name: string; batchYield: number }>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ProductionForm({ premixes, onSuccess, onCancel }: ProductionFormProps) {
  const [cocktailId, setCocktailId] = useState("");
  const [batchesCompleted, setBatchesCompleted] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cocktailId) {
      setError("Please select a premix");
      return;
    }

    const selectedPremix = premixes.find(p => p.id === cocktailId);
    if (!selectedPremix) {
      setError("Invalid premix selected");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const amount = batchesCompleted * selectedPremix.batchYield;
      const response = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cocktailId,
          amount,
          date: new Date().toISOString().split("T")[0],
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log production");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log production");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPremix = premixes.find(p => p.id === cocktailId);
  const totalBottles = selectedPremix ? batchesCompleted * selectedPremix.batchYield : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Log Batch Production</h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Premix Name
            </label>
            <select
              value={cocktailId}
              onChange={(e) => setCocktailId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              <option value="">Select a premix...</option>
              {premixes.map((premix) => (
                <option key={premix.id} value={premix.id}>
                  {premix.name} ({premix.batchYield.toFixed(2)} bottles/batch)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Batches Completed
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={batchesCompleted}
              onChange={(e) => setBatchesCompleted(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            />
          </div>

          {selectedPremix && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Total Production</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {totalBottles.toFixed(2)} bottles
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Logging..." : "Log Production"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
