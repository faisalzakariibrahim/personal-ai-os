"use client";
import { browserClient } from "@/lib/supabase-browser";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await browserClient().auth.signOut();
        window.location.href = "/login";
      }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-edge hover:text-white transition w-full"
    >
      <span className="text-bad">⏻</span> Sign out
    </button>
  );
}
