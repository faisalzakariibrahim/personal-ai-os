import { db } from "./supabase";
import { completeJson, CEO_MODEL } from "./claude";
import { searchMemories } from "./memory";
import { emit } from "./events";
import { assertWithinBudget } from "./usage";
import type { SimulationOutcome, UserRow } from "./types";

/**
 * Life Simulation Engine — "what happens if I choose X?"
 * Simulation, not prediction: best/expected/worst with confidence, grounded in memory.
 */
export async function runSimulation(user: UserRow, scenario: string): Promise<{ id: string; outcomes: SimulationOutcome }> {
  if (user.lockdown) throw new Error("Personal AI OS is in lockdown. Lift it in Settings to run simulations.");
  await assertWithinBudget(user);
  const memories = await searchMemories(user.id, scenario, { limit: 10 });

  const outcomes = await completeJson<SimulationOutcome>({
    model: CEO_MODEL,
    maxTokens: 1400,
    meta: { userId: user.id, context: "simulation" },
    system: [
      `You are the Life Simulation Engine in ${user.name}'s Personal AI OS.`,
      `You model possible futures for a decision. You NEVER claim certainty; you show consequences and let the human choose.`,
      `User goals: ${JSON.stringify(user.goals)}. Values: ${JSON.stringify(user.values)}.`,
      `Known decision patterns and facts:`,
      ...memories.map((m) => `- [${m.type}, conf ${m.confidence}] ${m.content}`),
      ``,
      `Return JSON: {"best": "best case in 2-3 sentences", "expected": "most likely case", "worst": "worst case", "recommendation": "what you'd suggest and why, referencing user goals", "confidence": 0.0-1.0, "impacts": [{"area": "finance|time|health|career|relationships", "effect": "one sentence"}]}`,
      `Lower your confidence when memories are sparse. Never manipulate; present trade-offs honestly.`,
    ].join("\n"),
    user: `Scenario: ${scenario}`,
  });

  const { data, error } = await db()
    .from("simulations")
    .insert({
      user_id: user.id,
      scenario,
      inputs: { memories_used: memories.length },
      outcomes,
      confidence: Math.max(0, Math.min(1, outcomes.confidence ?? 0.5)),
    })
    .select("id")
    .single();
  if (error) throw error;

  await emit({ userId: user.id, type: "simulation.completed", sender: "system", payload: { scenario } });
  return { id: data.id, outcomes };
}

export async function listSimulations(userId: string, limit = 20) {
  const { data, error } = await db()
    .from("simulations").select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
