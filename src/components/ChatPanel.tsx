"use client";
import { useState } from "react";

type Msg = { role: "user" | "ceo"; text: string };

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? "Something went wrong.";
      const suffix = data.approvalsCreated?.length
        ? `\n\n⚠ ${data.approvalsCreated.length} action(s) waiting in the Approval Center.`
        : "";
      setMessages((m) => [...m, { role: "ceo", text: reply + suffix }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ceo", text: `Error: ${e}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex flex-col h-[420px]">
      <div className="text-sm font-semibold text-white mb-3">Ask your CEO Agent</div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">
            Try: “Plan my day”, “Should I buy a new laptop?”, “Help me prioritize my product launches.”
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-w-[85%] ${
              m.role === "user" ? "ml-auto bg-accent/15 text-sky-100" : "bg-edge/60 text-slate-200"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && <div className="text-xs text-slate-400 animate-pulse">CEO Agent is coordinating specialists…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="What should I focus on today?"
          className="flex-1 rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-lg bg-accent/90 hover:bg-accent text-slate-900 font-semibold px-4 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
