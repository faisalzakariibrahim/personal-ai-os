"use client";
import { useState } from "react";

export default function AgentToggle({ slug, status: initial }: { slug: string; status: string }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (slug === "ceo") {
    return <span className="text-[10px] text-slate-500">cannot be disabled</span>;
  }

  async function toggle() {
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, status: next }),
    });
    if (res.ok) setStatus(next);
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
        status === "active" ? "bg-edge hover:bg-bad/30 text-slate-200" : "bg-good/80 hover:bg-good text-slate-900"
      }`}
    >
      {status === "active" ? "Disable" : "Enable"}
    </button>
  );
}
