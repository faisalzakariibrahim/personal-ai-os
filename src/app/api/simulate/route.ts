import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { runSimulation, listSimulations } from "@/lib/simulation";

export const maxDuration = 90;

export async function GET() {
  try {
    const user = await getOwner();
    return NextResponse.json({ simulations: await listSimulations(user.id) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { scenario } = await req.json();
    if (!scenario?.trim()) return NextResponse.json({ error: "Empty scenario" }, { status: 400 });
    const user = await getOwner();
    const result = await runSimulation(user, scenario.trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
