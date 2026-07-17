import type { RiskLevel } from "./types";

/**
 * Risk classification per the Agent OS spec.
 * 0 safe · 1 low (inform) · 2 medium (approval) · 3 high (explicit approval) · 4 critical (human-only)
 */
const CRITICAL = [/bank\s*transfer/i, /wire/i, /identity/i, /legal\s+agreement/i, /contract\s+sign/i];
const HIGH = [/purchase/i, /\bbuy\b/i, /\bspend\b/i, /subscri/i, /payment/i, /invest/i, /donat/i];
const MEDIUM = [/send\s+(an?\s+)?(email|message|dm|text)/i, /\bbook\b/i, /schedule.*(call|meeting|appointment)/i, /post\s+to/i, /publish/i, /delete/i];
const LOW = [/suggest/i, /recommend/i, /remind/i, /draft/i];

export function classifyRisk(action: string, cost?: number): RiskLevel {
  if (CRITICAL.some((r) => r.test(action))) return 4;
  if (typeof cost === "number" && cost >= 500) return 3;
  if (HIGH.some((r) => r.test(action))) return 3;
  if (typeof cost === "number" && cost > 0) return 3;
  if (MEDIUM.some((r) => r.test(action))) return 2;
  if (LOW.some((r) => r.test(action))) return 1;
  return 0;
}

export function requiresApproval(level: RiskLevel): boolean {
  return level >= 2;
}

/** Level 4 can never be auto-executed, even if an approval row exists. */
export function humanOnly(level: RiskLevel): boolean {
  return level >= 4;
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  0: "Safe",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};
