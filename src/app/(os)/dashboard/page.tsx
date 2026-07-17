import { db, getOwner } from "@/lib/supabase";
import { recentEvents } from "@/lib/events";
import ChatPanel from "@/components/ChatPanel";
import BriefingCard from "@/components/BriefingCard";
import InboxCard from "@/components/InboxCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getOwner();
  const [events, approvalsRes, agentsRes] = await Promise.all([
    recentEvents(user.id, 12),
    db().from("approvals").select("id").eq("user_id", user.id).eq("status", "pending"),
    db().from("agents").select("id").eq("user_id", user.id).eq("status", "active"),
  ]);
  const pending = approvalsRes.data?.length ?? 0;
  const active = agentsRes.data?.length ?? 0;
  const { data: spendData } = await db().rpc("daily_spend", { p_user_id: user.id });
  const spent = Number(spendData ?? 0);
  const cap = Number(user.daily_cost_cap_usd ?? 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Control</h1>
          <p className="text-sm text-slate-400">Welcome back, {user.name}.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="chip bg-edge text-slate-300">{active} agents active</span>
          <span className={`chip ${pending ? "bg-warn/20 text-warn" : "bg-edge text-slate-300"}`}>
            {pending} pending approval{pending === 1 ? "" : "s"}
          </span>
          <span className={`chip ${cap > 0 && spent >= cap ? "bg-bad/20 text-bad" : "bg-edge text-slate-300"}`}>
            ${spent.toFixed(2)}{cap > 0 ? ` / $${cap.toFixed(0)}` : ""} today
          </span>
        </div>
      </div>

      {user.lockdown && (
        <div className="panel border-bad/50 bg-bad/10 text-sm text-bad flex items-center justify-between">
          <span>⏻ Lockdown is active — all agents are paused.</span>
          <a href="/settings" className="underline">Lift it in Settings</a>
        </div>
      )}

      <BriefingCard />

      <InboxCard />

      <div className="grid lg:grid-cols-2 gap-6">
        <ChatPanel />
        <div className="panel">
          <div className="text-sm font-semibold text-white mb-3">Activity Timeline</div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {events.length === 0 && <div className="text-sm text-slate-500">No activity yet. Ask the CEO Agent something.</div>}
            {events.map((e: { id: string; type: string; sender: string; receiver: string | null; created_at: string }) => (
              <div key={e.id} className="flex items-center gap-3 text-xs border-b border-edge/50 pb-2">
                <span className="text-slate-500 w-32 shrink-0">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-accent font-mono">{e.type}</span>
                <span className="text-slate-400">{e.sender}{e.receiver ? ` → ${e.receiver}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
