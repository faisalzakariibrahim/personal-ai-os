import { db } from "./supabase";
import { emit } from "./events";
import { classifyRisk, humanOnly, requiresApproval } from "./risk";
import type { RiskLevel } from "./types";

/**
 * Approval engine — the security heart.
 * No agent can execute a restricted action (risk >= 2) without an approved row here.
 * Risk 4 actions can never be executed by the system at all.
 */
export async function requestApproval(opts: {
  userId: string;
  agentId?: string;
  decisionId?: string;
  action: string;
  reason: string;
  cost?: number;
}): Promise<{ id: string; risk: RiskLevel }> {
  const risk = classifyRisk(opts.action, opts.cost);
  const { data, error } = await db()
    .from("approvals")
    .insert({
      user_id: opts.userId,
      agent_id: opts.agentId ?? null,
      decision_id: opts.decisionId ?? null,
      action: opts.action,
      reason: opts.reason,
      cost: opts.cost ?? null,
      risk_level: risk,
    })
    .select("id")
    .single();
  if (error) throw error;

  await emit({
    userId: opts.userId,
    type: "approval.required",
    sender: "system",
    payload: { approval_id: data.id, action: opts.action, risk },
  });
  await db().from("notifications").insert({
    user_id: opts.userId,
    title: "Approval needed",
    body: opts.action,
    kind: "approval",
    link: "/approvals",
  });
  return { id: data.id, risk };
}

export async function resolveApproval(opts: {
  userId: string;
  approvalId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const { data, error } = await db()
    .from("approvals")
    .update({
      status: opts.decision,
      resolution_note: opts.note ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", opts.approvalId)
    .eq("user_id", opts.userId)
    .eq("status", "pending") // cannot re-resolve
    .select("id, action, agent_id")
    .single();
  if (error) throw error;

  await emit({
    userId: opts.userId,
    type: `approval.${opts.decision}`,
    sender: "user",
    payload: { approval_id: opts.approvalId, action: data.action },
  });

  // Trust feedback loop: approvals raise agent trust, rejections lower it.
  if (data.agent_id) {
    const delta = opts.decision === "approved" ? 0.02 : -0.05;
    await db().rpc("adjust_trust", { p_agent_id: data.agent_id, p_delta: delta }).then(
      () => undefined,
      () => undefined // rpc optional; ignore if absent
    );
  }
  return data;
}

/** Gate for executing an action. Returns true only if allowed to proceed. */
export async function canExecute(userId: string, action: string, cost?: number): Promise<boolean> {
  const risk = classifyRisk(action, cost);
  if (humanOnly(risk)) return false;
  if (!requiresApproval(risk)) return true;
  const { data } = await db()
    .from("approvals")
    .select("id")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("status", "approved")
    .gte("resolved_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function pendingApprovals(userId: string) {
  await db().rpc("expire_stale_approvals").then(() => undefined, () => undefined);
  const { data, error } = await db()
    .from("approvals")
    .select("*, agents(name, slug)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
