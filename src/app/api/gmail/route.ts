import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { getRecentMail, createDraft, sendMessage, googleStatus } from "@/lib/connectors/google";
import { complete } from "@/lib/claude";
import { assertWithinBudget } from "@/lib/usage";
import { canExecute } from "@/lib/approvals";

export const maxDuration = 60;

/** GET: read-only inbox summary. Summarizes the latest messages with Haiku. */
export async function GET() {
  try {
    const user = await getOwner();
    if ((await googleStatus(user.id)) !== "connected") {
      return NextResponse.json({ connected: false, summary: null, mail: [] });
    }
    await assertWithinBudget(user);
    const mail = await getRecentMail(user.id, 10);
    if (mail.length === 0) return NextResponse.json({ connected: true, summary: "Inbox is empty.", mail });

    const summary = await complete({
      meta: { userId: user.id, context: "gmail" },
      system: "You are the CEO Agent triaging the owner's inbox. Group the messages, flag anything urgent or needing a reply, and be concise. Do not invent senders or content.",
      user: mail.map((m) => `From: ${m.from}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`).join("\n\n"),
      maxTokens: 700,
    });
    return NextResponse.json({ connected: true, summary, mail });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST: create a Gmail DRAFT (never sends). Requires an approved approval for the
 * exact action string, so a human has signed off before anything is written.
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, mode } = await req.json();
    if (!to || !subject) return NextResponse.json({ error: "to and subject required" }, { status: 400 });
    const user = await getOwner();

    // mode 'send' actually delivers the email; 'draft' (default) only creates a draft.
    // Both require an approved approval for the exact action string.
    const send = mode === "send";
    const action = send ? `Send email to ${to}: ${subject}` : `Draft email to ${to}: ${subject}`;
    if (!(await canExecute(user.id, action))) {
      return NextResponse.json(
        { error: `This ${send ? "send" : "draft"} needs approval first. Ask the CEO Agent to prepare it, then approve it in the Approval Center.` },
        { status: 403 }
      );
    }
    if (send) {
      const messageId = await sendMessage(user.id, to, subject, body ?? "");
      return NextResponse.json({ ok: true, sent: true, messageId });
    }
    const draftId = await createDraft(user.id, to, subject, body ?? "");
    return NextResponse.json({ ok: true, draftId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
