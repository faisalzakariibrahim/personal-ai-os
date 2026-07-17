import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Route protection: everything requires a session belonging to OWNER_EMAIL,
 * except /login, /api/auth/*, and cron-authenticated briefing calls.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Vercel cron: GET /api/briefing with Authorization: Bearer CRON_SECRET
  if (
    path === "/api/briefing" &&
    process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.next();
  }

  const isPublic = path === "/login" || path.startsWith("/api/auth");

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const isOwner =
    !!user && (!process.env.OWNER_EMAIL ||
      user.email?.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase());

  if (!isOwner && !isPublic) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isOwner && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)"],
};
