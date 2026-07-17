# Personal AI OS v1.0 — Private Alpha

![CI](https://github.com/faisalzakariibrahim/personal-ai-os/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Your private AI executive team: a CEO Agent coordinating six specialist agents, with persistent memory, human-approval controls, a daily briefing, and a life simulation engine.

Built on your stack: **Next.js 14 (App Router) · Supabase (Postgres + pgvector) · Claude API · Vercel-ready.**

## Live infrastructure (already provisioned)

Everything below is **already created and seeded** — no SQL to run.

- Supabase project: `personal-ai-os` (`dqvgjnfyzfsvyzmecqmb`, Flicktek org, us-east-1)
- 13 tables with RLS enabled: users, agents, agent_permissions, memories, projects, tasks, events, decisions, approvals, agent_conversations, notifications, briefings, simulations
- pgvector (384-dim, HNSW index) + full-text hybrid search via `search_memories()` RPC
- Edge function `embed` (gte-small embeddings, deployed)
- Seeded: your user row + CEO Agent + Life/Finance/Calendar/Shopping/Learning/Health agents with least-privilege permissions

## Quick start

```bash
npm install
# 1. Open .env.local — Supabase URL + anon key are already filled in.
# 2. Paste your service role key from:
#    https://supabase.com/dashboard/project/dqvgjnfyzfsvyzmecqmb/settings/api
# 3. Paste your Anthropic API key.
npm run dev        # http://localhost:3000
npm test           # unit tests (risk engine, permission isolation)
npm run typecheck
```

## Architecture

```
User → Dashboard (Next.js)
         └── /api/chat → CEO Agent (Claude Sonnet)
               ├── plans + delegates → Specialist Agents (Claude Haiku)
               │     └── memory retrieval (pgvector, permission-scoped)
               ├── proposed actions → Approval Engine (risk 0–4)
               ├── learnings → Memory System
               └── everything → Event Bus (immutable audit log)
```

Core principle: **agents recommend, analyze, plan, and prepare — they never execute external actions without your approval.** Risk level 4 (bank transfers, legal, identity) is never executed by the system at all.

## Key modules

| Path | What it is |
|---|---|
| `src/lib/agents/base.ts` | BaseAgent: reason → memory → report loop, permission-gated |
| `src/lib/agents/ceo.ts` | CEO orchestration: plan → delegate (parallel) → approvals → synthesize → decision trail |
| `src/lib/agents/registry.ts` | Registry + temporary agent hiring (auto-expiring, least privilege) |
| `src/lib/memory.ts` | Store/search memories; hybrid vector + FTS via `search_memories` RPC |
| `src/lib/risk.ts` | Risk levels 0–4; ≥2 requires approval, 4 human-only |
| `src/lib/approvals.ts` | Approval engine + trust-score feedback loop |
| `src/lib/events.ts` | DB-backed event bus (audit timeline) |
| `src/lib/briefing.ts` | Daily briefing (cached per day, feedback loop) |
| `src/lib/simulation.ts` | Life Simulation Engine: best/expected/worst + confidence |
| `src/lib/integrations/` | Connector framework (stubs; writes require approvals) |
| `db/migrations/` | Copies of the SQL already applied to Supabase |

## Pages

`/dashboard` (briefing, CEO chat, activity timeline) · `/agents` · `/approvals` · `/memory` (view/teach/forget) · `/projects` (goals, tasks, decision trail) · `/simulate` · `/settings` (trust center).

## Roadmap to v1.1

Auth (Supabase Auth — RLS policies are already written for it), real Google Calendar/Gmail OAuth connectors, cron-scheduled morning briefing, agent marketplace groundwork. See `SECURITY.md` and `DEPLOYMENT.md`.
