import { db } from "../supabase";
import { BaseAgent } from "./base";
import type { AgentRow, UserRow } from "../types";

/** Agent Registry — load, activate, disable, and construct runtime agents. */
export async function listAgents(userId: string): Promise<AgentRow[]> {
  const { data, error } = await db()
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .order("type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AgentRow[];
}

export async function activeAgents(userId: string): Promise<AgentRow[]> {
  const all = await listAgents(userId);
  const now = Date.now();
  return all.filter(
    (a) => a.status === "active" && (!a.expires_at || new Date(a.expires_at).getTime() > now)
  );
}

export async function getAgent(userId: string, slug: string): Promise<AgentRow | null> {
  const { data } = await db()
    .from("agents").select("*")
    .eq("user_id", userId).eq("slug", slug).maybeSingle();
  return (data as AgentRow) ?? null;
}

export async function setAgentStatus(userId: string, slug: string, status: "active" | "disabled" | "archived") {
  const { error } = await db()
    .from("agents").update({ status })
    .eq("user_id", userId).eq("slug", slug);
  if (error) throw error;
}

export function instantiate(row: AgentRow, user: UserRow): BaseAgent {
  return new BaseAgent(row, user);
}

/**
 * Hiring system — CEO can create temporary agents for projects.
 * They expire and are archived after their mission completes.
 */
export async function hireTemporaryAgent(opts: {
  userId: string;
  slug: string;
  name: string;
  mission: string;
  personality?: string;
  rules?: string[];
  daysToLive?: number;
}): Promise<AgentRow> {
  const expires = new Date(Date.now() + (opts.daysToLive ?? 14) * 86400_000).toISOString();
  const { data, error } = await db()
    .from("agents")
    .insert({
      user_id: opts.userId,
      slug: opts.slug,
      name: opts.name,
      type: "temporary",
      role: "Project Specialist",
      mission: opts.mission,
      personality: opts.personality ?? "Focused project specialist.",
      rules: opts.rules ?? ["Cannot execute external actions", "Report to CEO Agent"],
      expires_at: expires,
      trust_score: 0.3,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Least privilege: recommend only, scoped memory.
  await db().from("agent_permissions").insert([
    { agent_id: data.id, permission: "action.recommend" },
    { agent_id: data.id, permission: "memory.read:general" },
    { agent_id: data.id, permission: "memory.write:general" },
  ]);
  return data as AgentRow;
}
