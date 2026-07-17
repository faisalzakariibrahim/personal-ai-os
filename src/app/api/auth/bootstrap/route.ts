import { NextRequest, NextResponse } from "next/server";
import { db, getOwner } from "@/lib/supabase";

/**
 * One-time owner setup: creates the auth user for OWNER_EMAIL and links it
 * to the seeded users row. Refuses to run twice, and refuses any other email.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Email and a password of 8+ characters required" }, { status: 400 });
    }

    const owner = await getOwner();
    if (owner.auth_id) {
      return NextResponse.json({ error: "Already set up — just sign in" }, { status: 403 });
    }
    const ownerEmail = (process.env.OWNER_EMAIL || owner.email).toLowerCase();
    if (email.toLowerCase() !== ownerEmail) {
      return NextResponse.json({ error: "This email is not the owner of this OS" }, { status: 403 });
    }

    const { data, error } = await db().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    const { error: linkErr } = await db()
      .from("users")
      .update({ auth_id: data.user.id })
      .eq("id", owner.id);
    if (linkErr) throw linkErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
