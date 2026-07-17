import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { pendingApprovals, resolveApproval } from "@/lib/approvals";

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json({ approvals: await pendingApprovals(user.id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { approvalId, decision, note } = await req.json();
    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision must be approved|rejected" }, { status: 400 });
    }
    const user = await getOwner();
    const data = await resolveApproval({ userId: user.id, approvalId, decision, note });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
