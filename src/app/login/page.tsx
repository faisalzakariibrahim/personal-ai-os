"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstRun, setFirstRun] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    const supabase = browserClient();
    try {
      if (firstRun) {
        const res = await fetch("/api/auth/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="panel w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-xl font-bold text-white">Personal AI OS</div>
          <div className="text-xs text-slate-400 mt-1">Private access — owner only</div>
        </div>
        <div className="space-y-3">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={firstRun ? "Choose a password (8+ chars)" : "Password"}
            className="w-full rounded-lg bg-base border border-edge px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <div className="text-xs text-bad">{error}</div>}
          <button
            onClick={submit} disabled={busy}
            className="w-full rounded-lg bg-accent/90 hover:bg-accent text-slate-900 font-semibold px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "Working…" : firstRun ? "Create owner account" : "Sign in"}
          </button>
          <button
            onClick={() => { setFirstRun(!firstRun); setError(""); }}
            className="w-full text-xs text-slate-400 hover:text-accent"
          >
            {firstRun ? "← Back to sign in" : "First time here? Set up the owner account"}
          </button>
        </div>
      </div>
    </div>
  );
}
