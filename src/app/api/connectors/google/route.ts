import { NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { googleConfigured, googleStatus, disconnectGoogle } from "@/lib/connectors/google";

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json({
      configured: googleConfigured(),
      status: await googleStatus(user.id),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getOwner();
    await disconnectGoogle(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
