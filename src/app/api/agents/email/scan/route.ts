import { NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { runEmailScan } from "@/lib/agents/email";

export const maxDuration = 60;

/** Daily inbox scan. Reached by Vercel cron (CRON_SECRET) or the owner on-demand. */
export async function GET() {
  try {
    const user = await getOwner();
    const result = await runEmailScan(user, 8);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
