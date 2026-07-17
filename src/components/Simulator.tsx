"use client";
import { useState } from "react";
import type { SimulationOutcome } from "@/lib/types";

export default function Simulator() {
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<SimulationOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!scenario.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.outcomes);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="What happens if I… (e.g. 'go full-time on the agency in 3 months')"
          className="flex-1 rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button onClick={run} disabled={busy}
          className="rounded-lg bg-accent/90 hover:bg-accent text-slate-900 font-semibold px-4 py-2 text-sm disabled:opacity-50">
          {busy ? "Simulating…" : "Simulate"}
        </button>
      </div>
      {error && <div className="text-sm text-bad">{error}</div>}
      {result && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="panel border-good/40">
            <div className="text-xs uppercase tracking-wide text-good mb-2">Best case</div>
            <p className="text-sm text-slate-200">{result.best}</p>
          </div>
          <div className="panel border-accent/40">
            <div className="text-xs uppercase tracking-wide text-accent mb-2">Expected</div>
            <p className="text-sm text-slate-200">{result.expected}</p>
          </div>
          <div className="panel border-bad/40">
            <div className="text-xs uppercase tracking-wide text-bad mb-2">Worst case</div>
            <p className="text-sm text-slate-200">{result.worst}</p>
          </div>
          <div className="panel md:col-span-3">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Recommendation · confidence {Math.round((result.confidence ?? 0.5) * 100)}%
            </div>
            <p className="text-sm text-slate-200 mb-3">{result.recommendation}</p>
            <div className="flex flex-wrap gap-2">
              {result.impacts?.map((imp, i) => (
                <span key={i} className="chip bg-edge text-slate-300">
                  <b className="mr-1 text-accent">{imp.area}:</b> {imp.effect}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
