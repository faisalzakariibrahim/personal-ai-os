import { NextRequest, NextResponse } from "next/server";
import { authorizeUrl, googleConfigured } from "@/lib/connectors/google";

/** Kicks off Google OAuth. Redirects the browser to Google's consent screen. */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "Google is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 400 }
    );
  }
  const origin = req.nextUrl.origin;
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(origin, state));
  // CSRF guard: remember the state in a short-lived cookie, checked on callback.
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });
  return res;
}
