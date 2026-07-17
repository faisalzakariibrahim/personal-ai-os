"use client";
import { useEffect, useState } from "react";
import type { BriefingContent } from "@/lib/types";

export default function BriefingCard() {
  const [briefing, setBriefing] = useState<{ id: string; content: BriefingContent; feedback: string | null } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(force = false) {
    setState("loading");
    try {
      const res = await fetch(`/api/briefing${force ? "?force=1" : ""}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBriefing(data);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { load(); }, []);

  async function feedback(f: "helpful" | "not_helpful") {
    if (!briefing) return;
    await fetch("/api/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefingId: briefing.id, feedback: f }),
    });
    setBriefing({ ...briefing, feedback: f });
  }

  if (state === "loading")
    return <div className="panel text-sm text-slate-400 animate-pulse">Generating today’s briefing…</div>;
  if (state === "error" || !briefing)
    return (
      <div className="panel text-sm text-slate-400">
        Couldn’t generate the briefing. Check ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.{" "}
        <button className="text-accent underline" onClick={() => load(true)}>Retry</button>
      </div>
    );

  const c = briefing.content;
  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-white">Daily Briefing</div>
        <button onClick={() => load(true)} className="text-xs text-slate-400 hover:text-accent">↻ Regenerate</button>
      </div>
      <p className="text-sm text-slate-300 mb-3">{c.greeting}</p>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Top priorities</div>
          <ol className="list-decimal list-inside space-y-1 text-slate-200">
            {c.priorities?.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Recommendations</div>
          <ul className="list-disc list-inside space-y-1 text-slate-200">
            {c.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        <div><span className="text-slate-500">Calendar:</span> {c.calendar}</div>
        <div><span className="text-slate-500">Finance:</span> {c.finance}</div>
        <div><span className="text-slate-500">Health:</span> {c.health}</div>
        {c.pending_decisions?.length > 0 && (
          <div><span className="text-warn">Awaiting you:</span> {c.pending_decisions.join("; ")}</div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="text-slate-500">Was this helpful?</span>
        <button
          onClick={() => feedback("helpful")}
          className={`chip border ${briefing.feedback === "helpful" ? "border-good text-good" : "border-edge text-slate-400 hover:text-good"}`}
        >👍 Helpful</button>
        <button
          onClick={() => feedback("not_helpful")}
          className={`chip border ${briefing.feedback === "not_helpful" ? "border-bad text-bad" : "border-edge text-slate-400 hover:text-bad"}`}
        >👎 Not helpful</button>
      </div>
    </div>
  );
}
