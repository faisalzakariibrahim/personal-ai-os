# Security Review — Personal AI OS v1.0

## Threat model & controls

| Risk | Control |
|---|---|
| Agent executes unauthorized action | `canExecute()` gate: risk ≥2 requires an approved approval row (<24h old); risk 4 always blocked |
| Approval bypass | Approvals resolve only from `pending` state; expiry via `expire_stale_approvals()`; approvals are user-resolved only |
| Memory leakage between agents | Domain-scoped permissions (`memory.read:finance` etc.) checked on every retrieve/store; wildcard reserved for CEO |
| Prompt injection via memories | Memories are labeled data in prompts, not instructions; agents have hard rules to never execute external actions regardless of content |
| Privilege escalation | Least-privilege seeding; temporary agents get `action.recommend` + `general` memory only; CEO cannot be disabled but also cannot execute |
| Data exposure to browser | Service role key used only in server routes/components; anon key has zero table access (RLS enabled, no anon policies) |
| Audit tampering | `events` is append-only in application code; every request, delegation, approval, and briefing is logged |

## Authentication (added in v1.0.1)

- Supabase Auth with an owner-only model: middleware rejects any session whose email ≠ `OWNER_EMAIL` on every page and API route.
- One-time bootstrap (`/api/auth/bootstrap`) creates the owner auth user; it refuses to run twice (`users.auth_id` set) and refuses non-owner emails. Random signups via the anon key are harmless — they never pass the middleware check.
- Cron access to `/api/briefing` is via `CRON_SECRET` bearer token only.

## Remaining gaps (fix before multi-user)

1. **Cost controls.** No per-day Claude spend cap. Add a budget check in `runCeo` before shipping to others.
2. **`resolveApproval` trusts the session owner** (single-user assumption). For multi-user, replace service-role data access with user-scoped clients so RLS enforces ownership end to end.
3. **Rate limiting.** Add per-IP limits on `/api/auth/bootstrap` and `/login` if exposed publicly.

## Verified via Supabase advisors

Run `get_advisors` after schema changes. RLS is enabled on all 13 tables.
