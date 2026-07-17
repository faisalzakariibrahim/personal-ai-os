import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const CEO_MODEL = process.env.CEO_MODEL || "claude-sonnet-5";
export const SPECIALIST_MODEL = process.env.SPECIALIST_MODEL || "claude-haiku-4-5-20251001";

/** Single completion; returns text. */
export async function complete(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await anthropic().messages.create({
    model: opts.model || SPECIALIST_MODEL,
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/** Completion that must return JSON matching T. Strips code fences defensively. */
export async function completeJson<T>(opts: {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
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
