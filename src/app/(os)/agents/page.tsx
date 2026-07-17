import { db, getOwner } from "@/lib/supabase";
import AgentToggle from "@/components/AgentToggle";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await getOwner();
  const { data: agents } = await db()
    .from("agents")
    .select("*, agent_permissions(permission)")
    .eq("user_id", user.id)
    .order("type");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agents</h1>
        <p className="text-sm text-slate-400">Your AI organization. Each agent has a mission, personality, and least-privilege permissions.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {(agents ?? []).map((a) => (
          <div key={a.id} className="panel">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-white">{a.name}</div>
              <div className="flex items-center gap-2">
                <span className={`chip ${a.type === "ceo" ? "bg-accent/20 text-accent" : a.type === "temporary" ? "bg-warn/20 text-warn" : "bg-edge text-slate-300"}`}>
                  {a.type}
                </span>
                <span className={`chip ${a.status === "active" ? "bg-good/20 text-good" : "bg-bad/20 text-bad"}`}>{a.status}</span>
                <AgentToggle slug={a.slug} status={a.status} />
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-1">{a.mission}</p>
            <p className="text-xs text-slate-500 italic mb-3">{a.personality}</p>
            <div className="text-xs text-slate-400 mb-2">
              Trust score:{" "}
              <span className={a.trust_score >= 0.7 ? "text-good" : a.trust_score >= 0.4 ? "text-warn" : "text-bad"}>
                {Math.round(a.trust_score * 100)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(a.agent_permissions ?? []).map((p: { permission: string }) => (
                <span key={p.permission} className="chip bg-base border border-edge text-slate-400 font-mono">{p.permission}</span>
              ))}
            </div>
            {Array.isArray(a.rules) && a.rules.length > 0 && (
              <ul className="mt-3 text-xs text-slate-500 list-disc list-inside">
                {a.rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
