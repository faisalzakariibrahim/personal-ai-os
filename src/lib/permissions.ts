import { db } from "./supabase";

/**
 * Permission strings: 'memory.read:finance', 'memory.write:*', 'action.recommend',
 * 'approval.request', 'tool.<name>.<op>'. '*' domain wildcard supported.
 */
export function permissionMatches(granted: string, requested: string): boolean {
  if (granted === requested) return true;
  const [gAction, gScope] = granted.split(":");
  const [rAction, rScope] = requested.split(":");
  if (gAction !== rAction) return false;
  if (gScope === "*") return true;
  return gScope === rScope;
}

export async function agentCan(agentId: string, permission: string): Promise<boolean> {
  const { data, error } = await db()
    .from("agent_permissions")
    .select("permission, granted")
    .eq("agent_id", agentId)
    .eq("granted", true);
  if (error) throw error;
  return (data ?? []).some((p) => permissionMatches(p.permission, permission));
}

/** Throws if the agent lacks the permission — use before any privileged operation. */
export async function assertPermission(agentId: string, permission: string): Promise<void> {
  if (!(await agentCan(agentId, permission))) {
    throw new Error(`Permission denied: agent ${agentId} lacks '${permission}'`);
  }
}
