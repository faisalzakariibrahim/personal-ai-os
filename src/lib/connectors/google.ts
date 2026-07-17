import { db } from "../supabase";

/**
 * Google connector — OAuth2 + read-only Calendar and Gmail, plus draft creation.
 * No googleapis dependency: everything is plain fetch against Google's REST APIs.
 * Activates only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose", // drafts only; never sends
  "openid",
  "email",
].join(" ");

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/connectors/google/callback`;
}

export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent", // force refresh_token on every connect
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(origin: string, code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(origin),
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string; refresh_token?: string; expires_in: number;
    scope: string; token_type: string; id_token?: string;
  }>;
}

export async function saveGoogleAccount(userId: string, tok: {
  access_token: string; refresh_token?: string; expires_in: number;
  scope: string; token_type: string; email?: string;
}) {
  const expires_at = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  const { error } = await db().from("connector_accounts").upsert(
    {
      user_id: userId, provider: "google",
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? null,
      scope: tok.scope, token_type: tok.token_type,
      expires_at, email: tok.email ?? null, status: "connected",
    },
    { onConflict: "user_id,provider" }
  );
  if (error) throw error;
}

/** Returns a valid access token, refreshing if expired. Null if not connected. */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const { data: acct } = await db()
    .from("connector_accounts")
    .select("*").eq("user_id", userId).eq("provider", "google").maybeSingle();
  if (!acct || acct.status !== "connected") return null;

  const stillValid = acct.expires_at && new Date(acct.expires_at).getTime() > Date.now();
  if (stillValid && acct.access_token) return acct.access_token;

  if (!acct.refresh_token) return acct.access_token ?? null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: acct.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    await db().from("connector_accounts").update({ status: "error" })
      .eq("user_id", userId).eq("provider", "google");
    return null;
  }
  const tok = await res.json();
  const expires_at = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  await db().from("connector_accounts").update({ access_token: tok.access_token, expires_at, status: "connected" })
    .eq("user_id", userId).eq("provider", "google");
  return tok.access_token;
}

export async function disconnectGoogle(userId: string) {
  await db().from("connector_accounts").delete().eq("user_id", userId).eq("provider", "google");
}

export interface CalEvent { summary: string; start: string; end: string; location?: string }

/** Today's calendar events (read-only). Empty array if not connected. */
export async function getTodaysEvents(userId: string, timezone: string): Promise<CalEvent[]> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return [];
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const params = new URLSearchParams({
    timeMin: start.toISOString(), timeMax: end.toISOString(),
    singleEvents: "true", orderBy: "startTime", timeZone: timezone,
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).map((e: {
    summary?: string; location?: string;
    start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string };
  }) => ({
    summary: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date ?? "",
    end: e.end?.dateTime ?? e.end?.date ?? "",
    location: e.location,
  }));
}

export interface MailSummary { id: string; from: string; subject: string; snippet: string; date: string }

/** Recent inbox messages (read-only metadata + snippet). */
export async function getRecentMail(userId: string, max = 10): Promise<MailSummary[]> {
  const token = await getGoogleAccessToken(userId);
  if (!token) return [];
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) return [];
  const list = await listRes.json();
  const ids: { id: string }[] = list.messages ?? [];
  const out: MailSummary[] = [];
  for (const { id } of ids) {
    const mRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!mRes.ok) continue;
    const m = await mRes.json();
    const headers: { name: string; value: string }[] = m.payload?.headers ?? [];
    const h = (n: string) => headers.find((x) => x.name === n)?.value ?? "";
    out.push({ id, from: h("From"), subject: h("Subject"), snippet: m.snippet ?? "", date: h("Date") });
  }
  return out;
}

/**
 * Create a Gmail DRAFT (never sends). Call ONLY after an approval is granted.
 * Returns the draft id.
 */
export async function createDraft(userId: string, to: string, subject: string, body: string): Promise<string> {
  const token = await getGoogleAccessToken(userId);
  if (!token) throw new Error("Google not connected");
  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: encoded } }),
  });
  if (!res.ok) throw new Error(`Draft creation failed: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

export async function googleStatus(userId: string): Promise<"connected" | "error" | "disconnected"> {
  const { data } = await db()
    .from("connector_accounts")
    .select("status").eq("user_id", userId).eq("provider", "google").maybeSingle();
  if (!data) return "disconnected";
  return data.status === "connected" ? "connected" : "error";
}
