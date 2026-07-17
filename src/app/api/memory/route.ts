import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { listMemories, storeMemory, deleteMemory, searchMemories } from "@/lib/memory";

export async function GET(req: NextRequest) {
  try {
    const user = await getOwner();
    const q = req.nextUrl.searchParams.get("q");
    const data = q ? await searchMemories(user.id, q) : await listMemories(user.id);
    return NextResponse.json({ memories: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await getOwner();
    await storeMemory({
      userId: user.id,
      content: body.content,
      type: body.type ?? "fact",
      domain: body.domain ?? "general",
      importance: body.importance ?? "medium",
      confidence: 0.95, // user-stated
      source: "user_stated",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const user = await getOwner();
    await deleteMemory(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
