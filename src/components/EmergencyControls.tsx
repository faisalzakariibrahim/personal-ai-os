"use client";
import { useEffect, useState } from "react";

export default function EmergencyControls() {
  const [lockdown, setLockdown] = useState(false);
  const [cap, setCap] = useState(5);
  const [spent, setSpent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    const d = await res.json();
    setLockdown(!!d.lockdown);
    setCap(Number(d.daily_cost_cap_usd ?? 5));
    setSpent(Number(d.spent_today ?? 0));
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
    setSaving(false);
  }

  if (!loaded) return <div className="text-sm text-slate-400 animate-pulse">Loading controls…</div>;

  const pct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-white">Emergency lockdown</div>
          <div className="text-xs text-slate-400">Instantly pause every agent. The CEO and specialists refuse all requests until lifted.</div>
        </div>
        <button
          onClick={() => save({ lockdown: !lockdown })}
          disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
            lockdown ? "bg-bad/90 hover:bg-bad text-slate-900" : "bg-edge hover:bg-edge/70 text-slate-200"
          }`}
        >
          {lockdown ? "Lockdown ON — click to lift" : "Enable lockdown"}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-white">Daily AI budget</div>
          <div className="text-xs text-slate-400">${spent.toFixed(2)} spent today</div>
        </div>
        <div className="h-1.5 rounded-full bg-edge overflow-hidden mb-2">
          <div className={`h-full ${pct >= 100 ? "bg-bad" : pct >= 70 ? "bg-warn" : "bg-good"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Cap ($/day, 0 = unlimited)</span>
          <input
            type="number" min={0} step={1} value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            className="w-24 rounded-lg bg-base border border-edge px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={() => save({ daily_cost_cap_usd: cap })}
            disabled={saving}
            className="rounded-lg border border-edge px-3 py-1 text-sm hover:border-accent disabled:opacity-50"
          >
            Save cap
          </button>
        </div>
      </div>
    </div>
  );
}
