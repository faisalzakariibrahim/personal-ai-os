import { db } from "./supabase";

/**
 * Cost controls. Rough per-1M-token USD prices (input/output).
 * Update if Anthropic pricing changes; slight over-estimation is safe.
 */
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model] ?? { in: 3, out: 15 };
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

export async function logUsage(opts: {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  context: string;
}) {
  const cost = estimateCost(opts.model, opts.inputTokens, opts.outputTokens);
  await db().from("api_usage").insert({
    user_id: opts.userId,
    model: opts.model,
    input_tokens: opts.inputTokens,
    output_tokens: opts.outputTokens,
    cost_usd: cost,
    context: opts.context,
  }).then(() => undefined, () => undefined); // never let logging break a request
}

export async function dailySpend(userId: string): Promise<number> {
  const { data } = await db().rpc("daily_spend", { p_user_id: userId });
  return Number(data ?? 0);
}

export class BudgetExceededError extends Error {
  constructor(public spent: number, public cap: number) {
    super(`Daily AI budget reached ($${spent.toFixed(2)} of $${cap.toFixed(2)}). Try again tomorrow or raise the cap in Settings.`);
    this.name = "BudgetExceededError";
  }
}

/** Throws BudgetExceededError if today's spend already meets/exceeds the cap. */
export async function assertWithinBudget(user: { id: string; daily_cost_cap_usd?: number }) {
  const cap = user.daily_cost_cap_usd ?? 5;
  if (cap <= 0) return; // 0 = unlimited
  const spent = await dailySpend(user.id);
  if (spent >= cap) throw new BudgetExceededError(spent, cap);
}
