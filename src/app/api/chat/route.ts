import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { runCeo } from "@/lib/agents/ceo";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
    const user = await getOwner();
    const result = await runCeo(user, message.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
