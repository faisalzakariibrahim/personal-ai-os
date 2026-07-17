import { NextRequest, NextResponse } from "next/server";
import { db, getOwner } from "@/lib/supabase";

export async function GET() {
  try {
    const user = await getOwner();
    const { data, error } = await db()
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const unread = (data ?? []).filter((n: { read: boolean }) => !n.read).length;
    return NextResponse.json({ notifications: data ?? [], unread });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, all } = await req.json();
    const user = await getOwner();
    const q = db().from("notifications").update({ read: true }).eq("user_id", user.id);
    if (all) await q.eq("read", false);
    else await q.eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
