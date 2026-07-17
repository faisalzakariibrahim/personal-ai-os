import { db } from "../supabase";
import { complete, SPECIALIST_MODEL } from "../claude";
import { emit } from "../events";
import { searchMemories, storeMemory } from "../memory";
import { agentCan } from "../permissions";
import { requestApproval } from "../approvals";
import type { AgentRow, Importance, MemoryType, UserRow } from "../types";

/**
 * BaseAgent — runtime wrapper around an agent row.
 * Identity/mission/personality/rules live in the DB; behavior is uniform:
 * receive_task → retrieve memory → reason (Claude) → report, with permission
 * checks on every memory access and approval requests for restricted actions.
 */
export class BaseAgent {
  constructor(public row: AgentRow, private user: UserRow) {}

  get slug() { return this.row.slug; }

  private systemPrompt(): string {
    return [
      `You are ${this.row.name}, the ${this.row.role} in ${this.user.name}'s Personal AI OS.`,
      `Mission: ${this.row.mission}`,
      `Personality: ${this.row.personality}`,
      `Hard rules you must never violate:`,
      ...(this.row.rules ?? []).map((r) => `- ${r}`),
      `- You can analyze, plan, and recommend. You cannot execute external actions; risky actions require human approval.`,
      `- Be concise. Cite which memories or facts you used.`,
      `User goals: ${JSON.stringify(this.user.goals)}`,
      `User values: ${JSON.stringify(this.user.values)}`,
    ].join("\n");
  }

  /** Domain used for memory isolation. */
  private domain(): string {
    const map: Record<string, string> = {
      ceo: "*", life: "life", finance: "finance", calendar: "calendar",
      shopping: "shopping", learning: "learning", health: "health",
    };
    return map[this.slug] ?? "general";
  }

  async retrieveMemory(query: string) {
    const domain = this.domain();
    const perm = `memory.read:${domain === "*" ? "*" : domain}`;
    if (!(await agentCan(this.row.id, perm))) return [];
    return searchMemories(this.user.id, query, {
      domain: domain === "*" ? undefined : domain,
      limit: 6,
    });
  }

  async remember(content: string, type: MemoryType = "fact", importance: Importance = "medium") {
    const domain = this.domain() === "*" ? "general" : this.domain();
    if (!(await agentCan(this.row.id, `memory.write:${domain}`)) &&
        !(await agentCan(this.row.id, "memory.write:*"))) return;
    await storeMemory({
      userId: this.user.id,
      agentId: this.row.id,
      content, type, domain, importance,
      source: "observation",
    });
  }

  async requestApproval(action: string, reason: string, cost?: number) {
    if (!(await agentCan(this.row.id, "approval.request"))) {
      throw new Error(`${this.slug} is not allowed to request approvals`);
    }
    return requestApproval({ userId: this.user.id, agentId: this.row.id, action, reason, cost });
  }

  /** Core reasoning loop for a delegated task. Logs conversation + events. */
  async receiveTask(task: string): Promise<string> {
    const memories = await this.retrieveMemory(task);
    const memoryBlock = memories.length
      ? `Relevant memories:\n${memories.map((m) => `- [${m.type}/${m.domain}, conf ${m.confidence}] ${m.content}`).join("\n")}`
      : "No relevant memories found.";

    await emit({ userId: this.user.id, type: "task.assigned", sender: "ceo", receiver: this.slug, payload: { task } });

    const answer = await complete({
      model: this.row.model || SPECIALIST_MODEL,
      system: this.systemPrompt(),
      user: `${memoryBlock}\n\nTask from the CEO Agent:\n${task}`,
      maxTokens: 1200,
      meta: { userId: this.user.id, context: `specialist:${this.slug}` },
    });

    await db().from("agent_conversations").insert([
      { user_id: this.user.id, agent_id: this.row.id, role: "system", content: task },
      { user_id: this.user.id, agent_id: this.row.id, role: "agent", content: answer },
    ]);
    await emit({
      userId: this.user.id, type: "task.completed", sender: this.slug, receiver: "ceo",
      payload: { task }, outcome: "ok",
    });
    return answer;
  }
}
