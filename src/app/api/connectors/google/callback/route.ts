import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/supabase";
import { exchangeCode, saveGoogleAccount } from "@/lib/connectors/google";

/** Google redirects here with ?code. We exchange it and store tokens. */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("g_oauth_state")?.value;

  if (!code) return NextResponse.redirect(`${origin}/settings?google=denied`);
  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${origin}/settings?google=badstate`);
  }

  try {
    const tok = await exchangeCode(origin, code);
    let email: string | undefined;
    if (tok.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64").toString());
        email = payload.email;
      } catch { /* ignore */ }
    }
    const user = await getOwner();
    await saveGoogleAccount(user.id, { ...tok, email });
    const res = NextResponse.redirect(`${origin}/settings?google=connected`);
    res.cookies.delete("g_oauth_state");
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/settings?google=error`);
  }
}
