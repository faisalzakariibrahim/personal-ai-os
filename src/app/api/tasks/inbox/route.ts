import { NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { prioritizedInbox } from "@/lib/agents/taskInbox";

export const maxDuration = 30;

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json(await prioritizedInbox(user));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
