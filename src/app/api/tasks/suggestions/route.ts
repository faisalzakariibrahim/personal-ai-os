import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { listSuggestions, acceptSuggestion, dismissSuggestion } from "@/lib/agents/email";

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json({ suggestions: await listSuggestions(user.id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json();
    const user = await getOwner();
    if (action === "accept") {
      const task = await acceptSuggestion(user.id, id);
      return NextResponse.json({ ok: true, task });
    }
    if (action === "dismiss") {
      await dismissSuggestion(user.id, id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "action must be accept|dismiss" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
