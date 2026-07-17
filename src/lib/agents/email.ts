import { db } from "../supabase";
import { completeJson, SPECIALIST_MODEL } from "../claude";
import { emit } from "../events";
import { assertWithinBudget } from "../usage";
import { getRecentMail, googleStatus } from "../connectors/google";
import type { UserRow } from "../types";

interface ExtractedTask {
  actionable: boolean;
  title?: string;
  detail?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  suggested_due?: string | null; // ISO date or null
}

/**
 * Email Agent daily scan.
 * Reads recent inbox, asks Haiku which messages contain an action item for the
 * owner, and writes NON-destructive task suggestions (deduped per message id).
 * Nothing is auto-created as a task and nothing is ever sent.
 */
export async function runEmailScan(user: UserRow, max = 12): Promise<{ scanned: number; suggested: number }> {
  if (user.lockdown) throw new Error("Personal AI OS is in lockdown.");
  if ((await googleStatus(user.id)) !== "connected") {
    return { scanned: 0, suggested: 0 };
  }
  await assertWithinBudget(user);

  const mail = await getRecentMail(user.id, max);
  let suggested = 0;

  for (const m of mail) {
    // Skip anything we've already turned into a suggestion.
    const { data: existing } = await db()
      .from("task_suggestions").select("id")
      .eq("user_id", user.id).eq("source_ref", m.id).maybeSingle();
    if (existing) continue;

    let extracted: ExtractedTask;
    try {
      extracted = await completeJson<ExtractedTask>({
        model: SPECIALIST_MODEL,
        maxTokens: 400,
        meta: { userId: user.id, context: "email" },
        system: [
          `You are ${user.name}'s Email Agent. Decide whether this email requires an action FROM ${user.name} (a reply, a to-do, a deadline).`,
          `Newsletters, receipts, notifications, and FYI messages are NOT actionable.`,
          `Today is ${new Date().toISOString().slice(0, 10)}. Timezone ${user.timezone}.`,
          `Return JSON: {"actionable": true|false, "title": "short task title", "detail": "1 sentence of context", "priority": "low|medium|high|urgent", "suggested_due": "YYYY-MM-DD or null"}`,
          `If not actionable, return {"actionable": false}. Never invent deadlines that aren't implied.`,
        ].join("\n"),
        user: `From: ${m.from}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`,
      });
    } catch {
      continue; // a bad parse on one email shouldn't stop the scan
    }

    if (!extracted.actionable || !extracted.title) continue;

    const { error } = await db().from("task_suggestions").insert({
      user_id: user.id,
      source_type: "email",
      source_ref: m.id,
      title: extracted.title,
      detail: extracted.detail ?? m.subject,
      from_addr: m.from,
      suggested_due: extracted.suggested_due || null,
      priority: extracted.priority ?? "medium",
    });
    if (!error) suggested++;
  }

  await db().from("users").update({ last_email_scan_at: new Date().toISOString() }).eq("id", user.id);
  await emit({
    userId: user.id, type: "email.scanned", sender: "email", receiver: "user",
    payload: { scanned: mail.length, suggested },
  });
  if (suggested > 0) {
    await db().from("notifications").insert({
      user_id: user.id,
      title: `${suggested} task suggestion${suggested === 1 ? "" : "s"} from your inbox`,
      body: "Review and confirm them in the Task Inbox.",
      kind: "info",
      link: "/inbox",
    });
  }
  return { scanned: mail.length, suggested };
}

export async function listSuggestions(userId: string) {
  const { data, error } = await db()
    .from("task_suggestions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "suggested")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Accept a suggestion -> create a real task and link it. */
export async function acceptSuggestion(userId: string, suggestionId: string) {
  const { data: s, error } = await db()
    .from("task_suggestions").select("*")
    .eq("id", suggestionId).eq("user_id", userId).eq("status", "suggested").single();
  if (error) throw error;

  const { data: task, error: tErr } = await db()
    .from("tasks")
    .insert({
      user_id: userId,
      title: s.title,
      detail: s.detail,
      priority: s.priority,
      due_at: s.suggested_due,
    })
    .select("id")
    .single();
  if (tErr) throw tErr;

  await db().from("task_suggestions")
    .update({ status: "accepted", task_id: task.id })
    .eq("id", suggestionId).eq("user_id", userId);
  return task;
}

export async function dismissSuggestion(userId: string, suggestionId: string) {
  const { error } = await db().from("task_suggestions")
    .update({ status: "dismissed" })
    .eq("id", suggestionId).eq("user_id", userId).eq("status", "suggested");
  if (error) throw error;
}
