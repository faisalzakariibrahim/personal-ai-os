import { db } from "../supabase";
import { getCalendarLoad, googleStatus } from "../connectors/google";
import type { UserRow } from "../types";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export interface InboxTask {
  id: string;
  title: string;
  detail: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  overdue: boolean;
  due_day_load: number | null; // # of calendar events that day (null if no calendar)
  reason: string;
}

/**
 * Calendar Agent's task-inbox prioritization (read-only calendar).
 * Orders open tasks by urgency (overdue → soonest due → priority) and annotates
 * each with how busy its due day already is, so the user sees what to tackle first.
 */
export async function prioritizedInbox(user: UserRow): Promise<{ tasks: InboxTask[]; calendarConnected: boolean }> {
  const { data: rows, error } = await db()
    .from("tasks")
    .select("id, title, detail, priority, status, due_at")
    .eq("user_id", user.id)
    .neq("status", "completed")
    .neq("status", "cancelled");
  if (error) throw error;

  const calendarConnected = (await googleStatus(user.id)) === "connected";
  const load = calendarConnected ? await getCalendarLoad(user.id, user.timezone, 14) : {};

  const now = Date.now();
  const tasks: InboxTask[] = (rows ?? []).map((t) => {
    const dueMs = t.due_at ? new Date(t.due_at).getTime() : null;
    const overdue = dueMs != null && dueMs < now;
    const dueDay = t.due_at ? t.due_at.slice(0, 10) : null;
    const dueDayLoad = calendarConnected && dueDay ? (load[dueDay] ?? 0) : null;

    let reason: string;
    if (overdue) reason = "Overdue";
    else if (dueMs != null) {
      const daysOut = Math.max(0, Math.round((dueMs - now) / 86400_000));
      reason = daysOut === 0 ? "Due today" : `Due in ${daysOut} day${daysOut === 1 ? "" : "s"}`;
      if (dueDayLoad != null) reason += ` · that day has ${dueDayLoad} event${dueDayLoad === 1 ? "" : "s"}`;
    } else reason = `No due date · ${t.priority} priority`;

    return {
      id: t.id, title: t.title, detail: t.detail, priority: t.priority, status: t.status,
      due_at: t.due_at, overdue, due_day_load: dueDayLoad, reason,
    };
  });

  // Sort: overdue first, then earliest due, then priority, then (as a nudge)
  // lighter calendar days ahead of heavier ones when due dates tie.
  tasks.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity;
    const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    const ap = PRIORITY_RANK[a.priority] ?? 2;
    const bp = PRIORITY_RANK[b.priority] ?? 2;
    if (ap !== bp) return ap - bp;
    return (a.due_day_load ?? 0) - (b.due_day_load ?? 0);
  });

  return { tasks, calendarConnected };
}
