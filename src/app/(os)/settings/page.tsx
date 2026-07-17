import { getOwner } from "@/lib/supabase";
import { listConnectors } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getOwner();
  const connectors = listConnectors();
  const envOk = {
    supabase: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("PASTE")),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("PASTE")),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings & Trust Center</h1>
        <p className="text-sm text-slate-400">Identity, system health, and integrations.</p>
      </div>

      <div className="panel">
        <div className="text-sm font-semibold text-white mb-3">Identity</div>
        <div className="text-sm text-slate-300">{user.name} · {user.email} · {user.timezone}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(user.values ?? []).map((v: string) => <span key={v} className="chip bg-edge text-slate-300">{v}</span>)}
        </div>
      </div>

      <div className="panel">
        <div className="text-sm font-semibold text-white mb-3">System Health</div>
        <div className="space-y-2 text-sm">
          <div>Supabase service key: <span className={envOk.supabase ? "text-good" : "text-bad"}>{envOk.supabase ? "configured" : "missing — paste into .env.local"}</span></div>
          <div>Anthropic API key: <span className={envOk.anthropic ? "text-good" : "text-bad"}>{envOk.anthropic ? "configured" : "missing — paste into .env.local"}</span></div>
        </div>
      </div>

      <div className="panel">
        <div className="text-sm font-semibold text-white mb-3">Integrations</div>
        <p className="text-xs text-slate-500 mb-3">All write actions through connectors require an approved approval — no exceptions.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {connectors.map((c) => (
            <div key={c.slug} className="rounded-lg border border-edge p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">{c.name}</div>
                <span className={`chip ${c.status === "connected" ? "bg-good/20 text-good" : "bg-edge text-slate-400"}`}>{c.status}</span>
              </div>
              <div className="mt-2 space-y-1">
                {c.scopes.map((s) => (
                  <div key={s.name} className="text-xs text-slate-400">
                    <span className={s.kind === "write" ? "text-warn" : "text-slate-500"}>[{s.kind}]</span> {s.description}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel border-bad/30">
        <div className="text-sm font-semibold text-bad mb-2">Emergency Controls</div>
        <p className="text-xs text-slate-400">
          Disable any agent from the database (`agents.status = 'disabled'`) or via POST /api/agents.
          The CEO Agent cannot be disabled. Level-4 (critical) actions are never executed by the system regardless of settings.
        </p>
      </div>
    </div>
  );
}
