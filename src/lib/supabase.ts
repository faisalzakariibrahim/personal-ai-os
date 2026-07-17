import { createClient, SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Server-only client (service role). Never import from client components. */
export function db(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}

/** Single-user alpha: fetch the owner row. */
export async function getOwner() {
  const { data, error } = await db().from("users").select("*").limit(1).single();
  if (error) throw error;
  return data;
}
