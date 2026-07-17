import { NextRequest, NextResponse } from "next/server";
import { db, getOwner } from "@/lib/supabase";
import { emit } from "@/lib/events";

/** Update owner controls: emergency lockdown and daily AI spend cap. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getOwner();
    const patch: Record<string, unknown> = {};

    if (typeof body.lockdown === "boolean") patch.lockdown = body.lockdown;
    if (typeof body.daily_cost_cap_usd === "number" && body.daily_cost_cap_usd >= 0) {
      patch.daily_cost_cap_usd = body.daily_cost_cap_usd;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { error } = await db().from("users").update(patch).eq("id", user.id);
    if (error) throw error;

    if (typeof body.lockdown === "boolean") {
      await emit({
        userId: user.id,
        type: body.lockdown ? "system.lockdown_enabled" : "system.lockdown_lifted",
        sender: "user",
      });
      await db().from("notifications").insert({
        user_id: user.id,
        title: body.lockdown ? "Lockdown enabled" : "Lockdown lifted",
        body: body.lockdown ? "All agents are paused." : "Agents resumed.",
        kind: "alert",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getOwner();
    const { data } = await db().rpc("daily_spend", { p_user_id: user.id });
    return NextResponse.json({
      lockdown: user.lockdown ?? false,
      daily_cost_cap_usd: user.daily_cost_cap_usd ?? 5,
      spent_today: Number(data ?? 0),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
