import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { requestApproval } from "@/lib/approvals";
import { googleStatus } from "@/lib/connectors/google";

/**
 * Queue an outbound email for approval. Nothing is sent here — this creates an
 * approval carrying the email payload. When you approve it in the Approval
 * Center, resolveApproval executes the send. This is the ONLY send path.
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, reason } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }
    const user = await getOwner();
    if ((await googleStatus(user.id)) !== "connected") {
      return NextResponse.json({ error: "Connect Google first (Settings)." }, { status: 400 });
    }
    const { id, risk } = await requestApproval({
      userId: user.id,
      action: `Send email to ${to}: ${subject}`,
      reason: reason || "Outbound email prepared by the Email Agent.",
      payload: { kind: "email_send", to, subject, body },
    });
    return NextResponse.json({ ok: true, approvalId: id, risk, note: "Approve it in the Approval Center to send." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
