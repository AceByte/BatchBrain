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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-extrabold text-slate-900">📦 Log Batch Production</h2>
          <button
            onClick={onCancel}
            className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Premix Name:
            </label>
            <select
              value={cocktailId}
              onChange={(e) => setCocktailId(e.target.value)}
              className="w-full rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Batches Completed:
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={batchesCompleted}
              onChange={(e) => setBatchesCompleted(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {selectedPremix && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-center ring-1 ring-blue-200">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Total Production:</p>
              <p className="mt-1 text-3xl font-extrabold text-blue-600">
                {totalBottles.toFixed(2)} bottles
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Notes (optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-gradient-to-br from-red-50 to-rose-50 p-4 text-sm font-semibold text-red-800 ring-1 ring-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "Logging..." : "✓ Log Production"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
