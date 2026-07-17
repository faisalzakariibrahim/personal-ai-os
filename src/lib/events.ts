import { db } from "./supabase";

/**
 * Event bus — DB-backed, immutable log.
 * Every inter-agent message and system action is recorded here for the audit timeline.
 */
export async function emit(opts: {
  userId: string;
  type: string;          // e.g. 'purchase.requested', 'approval.required', 'task.completed'
  sender: string;        // agent slug | 'user' | 'system'
  receiver?: string;     // agent slug; undefined = broadcast
  payload?: Record<string, unknown>;
  outcome?: string;
}) {
  const { error } = await db().from("events").insert({
    user_id: opts.userId,
    type: opts.type,
    sender: opts.sender,
    receiver: opts.receiver ?? null,
    payload: opts.payload ?? {},
    outcome: opts.outcome ?? null,
  });
  if (error) throw error;
}

export async function recentEvents(userId: string, limit = 30) {
  const { data, error } = await db()
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
