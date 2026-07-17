import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { listAgents, setAgentStatus } from "@/lib/agents/registry";

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json({ agents: await listAgents(user.id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { slug, status } = await req.json();
    if (slug === "ceo") return NextResponse.json({ error: "The CEO Agent cannot be disabled" }, { status: 400 });
    const user = await getOwner();
    await setAgentStatus(user.id, slug, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
