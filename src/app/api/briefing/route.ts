import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { getOrCreateBriefing, briefingFeedback } from "@/lib/briefing";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const user = await getOwner();
    const force = req.nextUrl.searchParams.get("force") === "1";
    const briefing = await getOrCreateBriefing(user, force);
    return NextResponse.json(briefing);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { briefingId, feedback } = await req.json();
    const user = await getOwner();
    await briefingFeedback(user.id, briefingId, feedback);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
