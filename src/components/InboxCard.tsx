"use client";
import { useEffect, useState } from "react";

export default function InboxCard() {
  const [data, setData] = useState<{ connected: boolean; summary: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel text-sm text-slate-400 animate-pulse">Checking inbox…</div>;
  if (!data?.connected)
    return (
      <div className="panel text-sm text-slate-400">
        <div className="text-sm font-semibold text-white mb-1">Inbox</div>
        Connect Google in <a href="/settings" className="text-accent underline">Settings</a> to get inbox summaries.
      </div>
    );

  return (
    <div className="panel">
      <div className="text-sm font-semibold text-white mb-2">Inbox Summary</div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{data.summary}</p>
    </div>
  );
}
