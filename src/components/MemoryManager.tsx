"use client";
import { useEffect, useState } from "react";

type Memory = {
  id: string; type: string; domain: string; content: string;
  importance: string; confidence: number; source: string; created_at: string;
};

export default function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q?: string) {
    setLoading(true);
    const res = await fetch(`/api/memory${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setMemories(data.memories ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!newMemory.trim()) return;
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMemory.trim(), type: "personal" }),
    });
    setNewMemory("");
    load();
  }

  async function remove(id: string) {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMemories((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query)}
          placeholder="Semantic search — e.g. 'how do I make purchase decisions?'"
          className="flex-1 rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button onClick={() => load(query)} className="rounded-lg border border-edge px-4 py-2 text-sm hover:border-accent">Search</button>
        <button onClick={() => { setQuery(""); load(); }} className="rounded-lg border border-edge px-3 py-2 text-sm text-slate-400 hover:text-white">All</button>
      </div>

      <div className="flex gap-2">
        <input
          value={newMemory}
          onChange={(e) => setNewMemory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Teach your AI something — e.g. 'I do deep work best after Fajr'"
          className="flex-1 rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-good"
        />
        <button onClick={add} className="rounded-lg bg-good/90 hover:bg-good text-slate-900 font-semibold px-4 py-2 text-sm">Remember</button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 animate-pulse">Loading memories…</div>
      ) : (
        <div className="space-y-2">
          {memories.length === 0 && <div className="text-sm text-slate-500">No memories yet.</div>}
          {memories.map((m) => (
            <div key={m.id} className="panel !p-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-200">{m.content}</div>
                <div className="mt-1 flex gap-2 text-[10px]">
                  <span className="chip bg-edge text-slate-400">{m.type}</span>
                  <span className="chip bg-edge text-slate-400">{m.domain}</span>
                  <span className="chip bg-edge text-slate-400">conf {Math.round(m.confidence * 100)}%</span>
                  <span className="chip bg-edge text-slate-400">{m.source}</span>
                </div>
              </div>
              <button onClick={() => remove(m.id)} className="text-xs text-slate-500 hover:text-bad shrink-0">Forget</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
