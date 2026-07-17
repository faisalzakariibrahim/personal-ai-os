"use client";
import { useEffect, useState } from "react";

export default function GoogleConnector() {
  const [state, setState] = useState<{ configured: boolean; status: string } | null>(null);

  async function load() {
    const res = await fetch("/api/connectors/google");
    setState(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function disconnect() {
    await fetch("/api/connectors/google", { method: "DELETE" });
    load();
  }

  const status = state?.status ?? "disconnected";
  return (
    <div className="rounded-lg border border-edge p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">Google (Calendar + Gmail)</div>
        <span className={`chip ${status === "connected" ? "bg-good/20 text-good" : status === "error" ? "bg-bad/20 text-bad" : "bg-edge text-slate-400"}`}>
          {status}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-slate-400">
        <div><span className="text-slate-500">[read]</span> Calendar events feed your daily briefing</div>
        <div><span className="text-slate-500">[read]</span> Inbox summaries</div>
        <div><span className="text-warn">[write]</span> Email drafts — created only after you approve (never sent)</div>
      </div>
      <div className="mt-3">
        {!state?.configured ? (
          <span className="text-xs text-slate-500">Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to enable.</span>
        ) : status === "connected" ? (
          <button onClick={disconnect} className="rounded-lg border border-edge px-3 py-1 text-xs hover:border-bad hover:text-bad">
            Disconnect
          </button>
        ) : (
          <a href="/api/connectors/google/authorize" className="inline-block rounded-lg bg-accent/90 hover:bg-accent text-slate-900 font-semibold px-3 py-1 text-xs">
            Connect Google
          </a>
        )}
      </div>
    </div>
  );
}
