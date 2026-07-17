import { db, getOwner } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getOwner();
  const [{ data: projects }, { data: tasks }, { data: decisions }] = await Promise.all([
    db().from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    db().from("tasks").select("*").eq("user_id", user.id).neq("status", "completed").order("created_at", { ascending: false }).limit(25),
    db().from("decisions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects & Decisions</h1>
        <p className="text-sm text-slate-400">Active goals, open tasks, and the decision trail behind every recommendation.</p>
      </div>

      <div className="panel">
        <div className="text-sm font-semibold text-white mb-3">Goals</div>
        <ul className="space-y-2 text-sm">
          {(user.goals ?? []).map((g: { goal: string; timeframe?: string; priority?: string }, i: number) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`chip ${g.priority === "high" ? "bg-accent/20 text-accent" : "bg-edge text-slate-300"}`}>{g.priority ?? "med"}</span>
              <span className="text-slate-200">{g.goal}</span>
              {g.timeframe && <span className="text-xs text-slate-500">({g.timeframe})</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel">
          <div className="text-sm font-semibold text-white mb-3">Open Tasks</div>
          {(!tasks || tasks.length === 0) && <div className="text-sm text-slate-500">No open tasks. The CEO Agent creates them as you work together.</div>}
          <div className="space-y-2">
            {(tasks ?? []).map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm border-b border-edge/50 pb-2">
                <span className={`chip ${t.priority === "urgent" || t.priority === "high" ? "bg-warn/20 text-warn" : "bg-edge text-slate-400"}`}>{t.priority}</span>
                <span className="text-slate-200">{t.title}</span>
                <span className="ml-auto text-xs text-slate-500">{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="text-sm font-semibold text-white mb-3">Decision Trail</div>
          {(!decisions || decisions.length === 0) && <div className="text-sm text-slate-500">No decisions recorded yet.</div>}
          <div className="space-y-3">
            {(decisions ?? []).map((d) => (
              <div key={d.id} className="border-b border-edge/50 pb-2">
                <div className="text-sm text-slate-200">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.reasoning} · confidence {Math.round(d.confidence * 100)}% · risk {d.risk_level} ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="text-sm font-semibold text-white mb-3">Project Workspaces</div>
        {(!projects || projects.length === 0) && (
          <div className="text-sm text-slate-500">
            No projects yet. Ask the CEO Agent to “start a project” and it can hire temporary specialist agents for it.
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {(projects ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-edge p-3">
              <div className="text-sm font-medium text-white">{p.name}</div>
              <div className="text-xs text-slate-400">{p.description}</div>
              <span className="chip bg-edge text-slate-300 mt-2">{p.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
