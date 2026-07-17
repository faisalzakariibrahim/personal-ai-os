"use client";
import { useEffect, useState } from "react";

type Note = {
  id: string; title: string; body: string | null; kind: string;
  read: boolean; link: string | null; created_at: string;
};

const KIND_STYLE: Record<string, string> = {
  info: "bg-edge text-slate-300",
  approval: "bg-warn/20 text-warn",
  alert: "bg-bad/20 text-bad",
  briefing: "bg-accent/20 text-accent",
};

export default function NotificationsList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    const d = await res.json();
    setNotes(d.notifications ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }
  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }

  if (loading) return <div className="panel text-sm text-slate-400 animate-pulse">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={markAll} className="text-xs text-slate-400 hover:text-accent">Mark all read</button>
      </div>
      {notes.length === 0 && <div className="panel text-sm text-slate-500">No notifications.</div>}
      {notes.map((n) => (
        <div key={n.id} className={`panel !p-3 flex items-start justify-between gap-3 ${n.read ? "opacity-60" : ""}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`chip ${KIND_STYLE[n.kind] ?? KIND_STYLE.info}`}>{n.kind}</span>
              <span className="text-sm font-medium text-white">{n.title}</span>
            </div>
            {n.body && <div className="text-sm text-slate-400 mt-1">{n.body}</div>}
            <div className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {n.link && <a href={n.link} className="text-xs text-accent hover:underline">Open</a>}
            {!n.read && <button onClick={() => markOne(n.id)} className="text-xs text-slate-500 hover:text-white">Mark read</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
