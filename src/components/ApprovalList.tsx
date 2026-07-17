"use client";
import { useEffect, useState } from "react";

const RISK_STYLE: Record<number, string> = {
  0: "bg-edge text-slate-300", 1: "bg-good/20 text-good",
  2: "bg-warn/20 text-warn", 3: "bg-orange-500/20 text-orange-400", 4: "bg-bad/20 text-bad",
};
const RISK_LABEL: Record<number, string> = { 0: "Safe", 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };

type Approval = {
  id: string; action: string; reason: string; cost: number | null;
  risk_level: number; created_at: string; expires_at: string;
  agents: { name: string } | null;
};

export default function ApprovalList() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/approvals");
    const data = await res.json();
    setApprovals(data.approvals ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string, decision: "approved" | "rejected") {
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId: id, decision }),
    });
    load();
  }

  if (loading) return <div className="panel text-sm text-slate-400 animate-pulse">Loading approvals…</div>;
  if (!approvals.length)
    return <div className="panel text-sm text-slate-400">Nothing pending. Your agents will queue anything risky here before acting.</div>;

  return (
    <div className="space-y-4">
      {approvals.map((a) => (
        <div key={a.id} className="panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-white">{a.action}</div>
              <div className="text-sm text-slate-400 mt-1">{a.reason}</div>
              <div className="text-xs text-slate-500 mt-2">
                {a.agents?.name ?? "System"} · {new Date(a.created_at).toLocaleString()} ·
                expires {new Date(a.expires_at).toLocaleString()}
                {a.cost != null && <> · <span className="text-warn">${a.cost}</span></>}
              </div>
            </div>
            <span className={`chip ${RISK_STYLE[a.risk_level]}`}>{RISK_LABEL[a.risk_level]} risk</span>
          </div>
          <div className="mt-4 flex gap-2">
            {a.risk_level >= 4 ? (
              <span className="text-xs text-bad">Critical action — the system will never execute this. Handle it yourself.</span>
            ) : (
              <>
                <button onClick={() => resolve(a.id, "approved")}
                  className="rounded-lg bg-good/90 hover:bg-good text-slate-900 font-semibold px-4 py-1.5 text-sm">Approve</button>
                <button onClick={() => resolve(a.id, "rejected")}
                  className="rounded-lg bg-bad/80 hover:bg-bad text-slate-900 font-semibold px-4 py-1.5 text-sm">Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
