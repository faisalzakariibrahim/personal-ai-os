"use client";
import { useEffect, useState } from "react";

type Suggestion = {
  id: string; title: string; detail: string | null; from_addr: string | null;
  suggested_due: string | null; priority: string;
};
type InboxTask = {
  id: string; title: string; detail: string | null; priority: string;
  due_at: string | null; overdue: boolean; due_day_load: number | null; reason: string;
};

const PRI: Record<string, string> = {
  urgent: "bg-bad/20 text-bad", high: "bg-warn/20 text-warn",
  medium: "bg-edge text-slate-300", low: "bg-edge text-slate-500",
};

export default function TaskInbox() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  async function load() {
    const [sRes, iRes] = await Promise.all([
      fetch("/api/tasks/suggestions").then((r) => r.json()),
      fetch("/api/tasks/inbox").then((r) => r.json()),
    ]);
    setSuggestions(sRes.suggestions ?? []);
    setTasks(iRes.tasks ?? []);
    setCalendarConnected(!!iRes.calendarConnected);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string, action: "accept" | "dismiss") {
    setSuggestions((s) => s.filter((x) => x.id !== id));
    await fetch("/api/tasks/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (action === "accept") load();
  }

  async function scanNow() {
    setScanning(true);
    await fetch("/api/agents/email/scan");
    await load();
    setScanning(false);
  }

  if (loading) return <div className="panel text-sm text-slate-400 animate-pulse">Loading your inbox…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {calendarConnected
            ? "Prioritized by due date and how busy each day already is."
            : "Connect Google in Settings to factor in your calendar load."}
        </div>
        <button
          onClick={scanNow} disabled={scanning}
          className="rounded-lg bg-accent/90 hover:bg-accent text-slate-900 font-semibold px-4 py-1.5 text-sm disabled:opacity-50"
        >
          {scanning ? "Scanning inbox…" : "Scan inbox now"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-white mb-2">
            From your inbox — {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} to confirm
          </div>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="panel !p-3 flex items-start justify-between gap-3 border-accent/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`chip ${PRI[s.priority] ?? PRI.medium}`}>{s.priority}</span>
                    <span className="text-sm font-medium text-white">{s.title}</span>
                  </div>
                  {s.detail && <div className="text-sm text-slate-400 mt-1">{s.detail}</div>}
                  <div className="text-[10px] text-slate-500 mt-1">
                    {s.from_addr && <>from {s.from_addr}</>}
                    {s.suggested_due && <> · due {new Date(s.suggested_due).toLocaleDateString()}</>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => resolve(s.id, "accept")}
                    className="rounded-lg bg-good/90 hover:bg-good text-slate-900 font-semibold px-3 py-1 text-xs">Add task</button>
                  <button onClick={() => resolve(s.id, "dismiss")}
                    className="rounded-lg border border-edge px-3 py-1 text-xs text-slate-400 hover:text-white">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-white mb-2">Task inbox</div>
        {tasks.length === 0 && <div className="panel text-sm text-slate-500">No open tasks. Accept a suggestion or ask the CEO Agent to create one.</div>}
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="panel !p-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${PRI[t.priority] ?? PRI.medium}`}>{t.priority}</span>
                  <span className="text-sm text-slate-100">{t.title}</span>
                </div>
                {t.detail && <div className="text-xs text-slate-500 mt-0.5">{t.detail}</div>}
              </div>
              <div className={`text-xs shrink-0 ${t.overdue ? "text-bad" : "text-slate-400"}`}>{t.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
