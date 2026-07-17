// Personal AI OS — shared types

export type AgentType = "ceo" | "specialist" | "temporary";
export type AgentStatus = "active" | "disabled" | "archived";
export type MemoryType =
  | "working" | "session" | "personal" | "experience" | "decision" | "fact" | "preference";
export type Importance = "low" | "medium" | "high";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

/** Risk levels per the Agent OS spec (0 safe → 4 critical, human-only). */
export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export interface UserRow {
  id: string;
  name: string;
  email: string;
  timezone: string;
  values: string[];
  goals: { goal: string; timeframe?: string; priority?: string; progress?: string }[];
  preferences: Record<string, unknown>;
}

export interface AgentRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  type: AgentType;
  role: string;
  mission: string;
  personality: string;
  rules: string[];
  status: AgentStatus;
  trust_score: number;
  model: string;
  expires_at: string | null;
}

export interface MemoryRow {
  id: string;
  type: MemoryType;
  domain: string;
  content: string;
  importance: Importance;
  confidence: number;
  source: string;
  created_at: string;
}

export interface ApprovalRow {
  id: string;
  agent_id: string | null;
  action: string;
  reason: string;
  cost: number | null;
  risk_level: RiskLevel;
  status: ApprovalStatus;
  expires_at: string;
  created_at: string;
}

export interface DecisionRow {
  id: string;
  title: string;
  recommendation: string;
  reasoning: string;
  evidence: unknown[];
  alternatives: unknown[];
  confidence: number;
  risk_level: RiskLevel;
  created_at: string;
}

export interface Delegation {
  agent: string; // slug
  task: string;
}

export interface CeoPlan {
  intent: string;
  delegations: Delegation[];
  proposed_actions: ProposedAction[];
  memory_candidates: { content: string; type: MemoryType; domain: string; importance: Importance }[];
  direct_answer?: string;
}

export interface ProposedAction {
  action: string;
  reason: string;
  cost?: number;
}

export interface BriefingContent {
  greeting: string;
  priorities: string[];
  calendar: string;
  finance: string;
  health: string;
  recommendations: string[];
  pending_decisions: string[];
}

export interface SimulationOutcome {
  best: string;
  expected: string;
  worst: string;
  recommendation: string;
  confidence: number;
  impacts: { area: string; effect: string }[];
}
