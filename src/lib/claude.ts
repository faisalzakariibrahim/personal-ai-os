import Anthropic from "@anthropic-ai/sdk";
import { logUsage } from "./usage";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const CEO_MODEL = process.env.CEO_MODEL || "claude-sonnet-5";
export const SPECIALIST_MODEL = process.env.SPECIALIST_MODEL || "claude-haiku-4-5-20251001";

/** Pass this so token usage is attributed to the owner + a context label. */
export interface UsageMeta {
  userId?: string;
  context?: string;
}

/** Single completion; returns text. Logs token usage when meta.userId is set. */
export async function complete(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
  meta?: UsageMeta;
}): Promise<string> {
  const model = opts.model || SPECIALIST_MODEL;
  const res = await anthropic().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  if (opts.meta?.userId) {
    await logUsage({
      userId: opts.meta.userId,
      model,
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
      context: opts.meta.context ?? "chat",
    });
  }
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/** Completion that must return JSON matching T. Strips code fences defensively. */
export async function completeJson<T>(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
  meta?: UsageMeta;
}): Promise<T> {
  const raw = await complete({
    ...opts,
    system: opts.system + "\nRespond with ONLY valid JSON. No markdown, no commentary.",
  });
  const cleaned = raw.replace(/^```(json)?/m, "").replace(/```\s*$/m, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
