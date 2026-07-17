import { db } from "./supabase";
import type { NextRequest } from "next/server";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit backed by the rate_limits table.
 * Returns true if the request is ALLOWED, false if it exceeded the limit.
 * Fails open (allows) on DB error so a limiter outage can't lock users out.
 */
export async function rateLimit(opts: {
  key: string;        // e.g. "bootstrap"
  ip: string;
  limit: number;      // max requests per window
  windowSec: number;  // window size in seconds
}): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (opts.windowSec * 1000)) * opts.windowSec * 1000);
  const bucket = `${opts.key}:${opts.ip}`;
  try {
    const { data, error } = await db().rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_window_start: windowStart.toISOString(),
    });
    if (error) return { allowed: true, remaining: opts.limit };
    const count = Number(data ?? 0);
    return { allowed: count <= opts.limit, remaining: Math.max(0, opts.limit - count) };
  } catch {
    return { allowed: true, remaining: opts.limit };
  }
}
