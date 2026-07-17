"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client — anon key only, used solely for auth (RLS blocks anon table access). */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
