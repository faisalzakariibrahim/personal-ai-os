import { db } from "../supabase";
import { completeJson, complete, CEO_MODEL } from "../claude";
import { emit } from "../events";
import { searchMemories, storeMemory } from "../memory";
import { requestApproval } from "../approvals";
import { classifyRisk } from "../risk";
import { activeAgents, instantiate } from "./registry";
import type { AgentRow, CeoPlan, UserRow } from "../types";

/**
 * CEO Agent — central coordinator.
 * Flow: understand → plan (which specialists, which actions) → delegate →
 * synthesize → store learnings → surface approvals. Never bypasses approval rules.
 */
export async function runCeo(user: UserRow, request: string): Promise<{
  reply: string;
  approvalsCreated: { id: string; action: string; risk: number }[];
}> {
  const agents = await activeAgents(user.id);
  const ceo = agents.find((a) => a.slug === "ceo");
  const specialists = agents.filter((a) => a.slug !== "ceo");
  const memories = await searchMemories(user.id, request, { limit: 8 });

  await emit({ userId: user.id, type: "request.received", sender: "user", receiver: "ceo", payload: { request } });

  // 1) Plan
  const plan = await completeJson<CeoPlan>({
    model: ceo?.model || CEO_MODEL,
    maxTokens: 1200,
    system: [
      `You are the CEO Agent of ${user.name}'s Personal AI OS — the executive coordinator of a team of specialist agents.`,
      `Available specialists (slug — mission):`,
      ...specialists.map((s) => `- ${s.slug} — ${s.mission}`),
      `User goals: ${JSON.stringify(user.goals)}. Values: ${JSON.stringify(user.values)}.`,
      `Relevant memories:`,
      ...memories.map((m) => `- [${m.type}] ${m.content}`),
      ``,
      `Decide how to handle the user's request. Return JSON:`,
      `{`,
      `  "intent": "one-line summary of what the user wants",`,
      `  "delegations": [{"agent": "<slug>", "task": "<specific task>"}],  // only agents that add value, may be empty`,
      `  "proposed_actions": [{"action": "<external action needing approval>", "reason": "why", "cost": <number optional>}],  // empty if none`,
      `  "memory_candidates": [{"content": "<durable learning about the user>", "type": "preference|decision|fact|personal", "domain": "finance|calendar|health|shopping|learning|life|general", "importance": "low|medium|high"}],`,
      `  "direct_answer": "<answer here ONLY if no delegation is needed>"`,
      `}`,
      `Rules: you can recommend and prepare but never execute external actions; anything that spends money, sends messages, or changes external systems goes in proposed_actions.`,
    ].join("\n"),
    user: request,
  });

  // 2) Delegate in parallel
  const results: { slug: string; output: string }[] = [];
  const chosen = (plan.delegations ?? []).filter((d) => specialists.some((s) => s.slug === d.agent));
  await Promise.all(
    chosen.map(async (d) => {
      const row = specialists.find((s) => s.slug === d.agent) as AgentRow;
      const agent = instantiate(row, user);
      const output = await agent.receiveTask(d.task);
      results.push({ slug: d.agent, output });
    })
  );

  // 3) Approvals for proposed actions (never auto-execute)
  const approvalsCreated: { id: string; action: string; risk: number }[] = [];
  for (const pa of plan.proposed_actions ?? []) {
    const { id, risk } = await requestApproval({
      userId: user.id,
      agentId: ceo?.id,
      action: pa.action,
      reason: pa.reason,
      cost: pa.cost,
    });
    approvalsCreated.push({ id, action: pa.action, risk });
  }

  // 4) Store durable memories
  for (const mc of (plan.memory_candidates ?? []).slice(0, 3)) {
    await storeMemory({
      userId: user.id, agentId: ceo?.id,
      content: mc.content, type: mc.type, domain: mc.domain,
      importance: mc.importance, source: "inference", confidence: 0.55,
    });
  }

  // 5) Synthesize
  let reply: string;
  if (results.length === 0 && plan.direct_answer) {
    reply = plan.direct_answer;
  } else {
    reply = await complete({
      model: ceo?.model || CEO_MODEL,
      maxTokens: 1400,
      system: [
        `You are the CEO Agent. Synthesize your specialists' reports into one clear, concise answer for ${user.name}.`,
        `Explain reasoning briefly. If approvals were created, tell the user they're waiting in the Approval Center.`,
        `Approvals created: ${approvalsCreated.map((a) => a.action).join("; ") || "none"}.`,
      ].join("\n"),
      user: `User request: ${request}\n\nSpecialist reports:\n${results
        .map((r) => `## ${r.slug}\n${r.output}`)
        .join("\n\n")}`,
    });
  }

  // 6) Record the decision trail
  await db().from("decisions").insert({
    user_id: user.id,
    agent_id: ceo?.id ?? null,
    title: plan.intent || request.slice(0, 120),
    recommendation: reply.slice(0, 4000),
    reasoning: `Delegated to: ${chosen.map((d) => d.agent).join(", ") || "none"}.`,
    evidence: memories.map((m) => m.content).slice(0, 5),
    alternatives: [],
    confidence: 0.7,
    risk_level: Math.max(0, ...approvalsCreated.map((a) => a.risk)),
  });
  await db().from("agent_conversations").insert([
    { user_id: user.id, agent_id: ceo?.id ?? null, role: "user", content: request },
    { user_id: user.id, agent_id: ceo?.id ?? null, role: "agent", content: reply },
  ]);
  await emit({
    userId: user.id, type: "request.completed", sender: "ceo", receiver: "user",
    payload: { intent: plan.intent, delegations: chosen.length, approvals: approvalsCreated.length },
    outcome: "ok",
  });

  return { reply, approvalsCreated };
}

export { classifyRisk };
