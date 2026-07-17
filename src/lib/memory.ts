import { db } from "./supabase";
import type { Importance, MemoryRow, MemoryType } from "./types";

const EMBED_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`;

/** 384-dim gte-small embedding via Supabase edge function. Returns null on failure (FTS fallback). */
export async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const { embeddings } = await res.json();
    return embeddings?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function storeMemory(opts: {
  userId: string;
  agentId?: string;
  content: string;
  type?: MemoryType;
  domain?: string;
  importance?: Importance;
  confidence?: number;
  source?: string;
  expiresAt?: string;
}) {
  const embedding = await embed(opts.content);
  const { error } = await db().from("memories").insert({
    user_id: opts.userId,
    agent_id: opts.agentId ?? null,
    content: opts.content,
    type: opts.type ?? "fact",
    domain: opts.domain ?? "general",
    importance: opts.importance ?? "medium",
    confidence: opts.confidence ?? 0.6,
    source: opts.source ?? "inference",
    embedding,
    expires_at: opts.expiresAt ?? null,
  });
  if (error) throw error;
}

/** Hybrid semantic + full-text search via the search_memories RPC. */
export async function searchMemories(
  userId: string,
  query: string,
  opts?: { domain?: string; limit?: number }
): Promise<MemoryRow[]> {
  const embedding = await embed(query);
  const { data, error } = await db().rpc("search_memories", {
    p_user_id: userId,
    p_query: query,
    p_embedding: embedding,
    p_domain: opts?.domain ?? null,
    p_limit: opts?.limit ?? 8,
  });
  if (error) throw error;
  return (data ?? []) as MemoryRow[];
}

export async function listMemories(userId: string, limit = 100) {
  const { data, error } = await db()
    .from("memories")
    .select("id, type, domain, content, importance, confidence, source, created_at")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function deleteMemory(userId: string, id: string) {
  const { error } = await db().from("memories").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
