import { db } from "./supabase";
import { completeJson, CEO_MODEL } from "./claude";
import { listMemories } from "./memory";
import { pendingApprovals } from "./approvals";
import { emit } from "./events";
import type { BriefingContent, UserRow } from "./types";

/** Daily briefing — CEO-generated morning summary, cached per day. */
export async function getOrCreateBriefing(user: UserRow, force = false): Promise<{ id: string; content: BriefingContent; feedback: string | null }> {
  const today = new Date().toISOString().slice(0, 10);

  if (!force) {
    const { data: existing } = await db()
      .from("briefings").select("id, content, feedback")
      .eq("user_id", user.id).eq("briefing_date", today).maybeSingle();
    if (existing) return existing as never;
  }

  const [memories, approvals, tasksRes] = await Promise.all([
    listMemories(user.id, 30),
    pendingApprovals(user.id),
    db().from("tasks").select("title, status, priority, due_at")
      .eq("user_id", user.id).neq("status", "completed").limit(20),
  ]);

  const content = await completeJson<BriefingContent>({
    model: CEO_MODEL,
    maxTokens: 1200,
    system: [
      `You are the CEO Agent generating ${user.name}'s morning briefing. Timezone: ${user.timezone}. Date: ${today}.`,
      `Goals: ${JSON.stringify(user.goals)}. Values: ${JSON.stringify(user.values)}.`,
      `Open tasks: ${JSON.stringify(tasksRes.data ?? [])}`,
      `Pending approvals: ${JSON.stringify(approvals.map((a: { action: string }) => a.action))}`,
      `Recent memories: ${memories.slice(0, 15).map((m: { content: string }) => m.content).join(" | ")}`,
      `Return JSON: {"greeting": "...", "priorities": ["top 3"], "calendar": "1-2 sentence summary", "finance": "1-2 sentence note", "health": "1-2 sentence note", "recommendations": ["2-3 actionable items"], "pending_decisions": ["items awaiting the user"]}`,
      `Be specific and grounded in the data above; do not invent events or numbers.`,
    ].join("\n"),
    user: "Generate today's briefing.",
  });

  const { data, error } = await db()
    .from("briefings")
    .upsert(
      { user_id: user.id, briefing_date: today, content },
      { onConflict: "user_id,briefing_date" }
    )
    .select("id, content, feedback")
    .single();
  if (error) throw error;

  await emit({ userId: user.id, type: "briefing.generated", sender: "ceo", receiver: "user", payload: { date: today } });
  return data as never;
}

export async function briefingFeedback(userId: string, briefingId: string, feedback: "helpful" | "not_helpful") {
  const { error } = await db()
    .from("briefings").update({ feedback })
    .eq("id", briefingId).eq("user_id", userId);
  if (error) throw error;
}
