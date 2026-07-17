# Database

The live schema is already applied to Supabase project `dqvgjnfyzfsvyzmecqmb` as migrations:

1. `core_schema` — extensions (vector, pg_trgm), 13 tables, indexes, updated_at triggers
2. `rls_and_search` — RLS on all tables, auth-ready owner policies, `search_memories()` hybrid RPC, `expire_stale_approvals()`
3. `seed_owner_and_agents` — owner user + CEO and 6 specialists with least-privilege permissions
4. `adjust_trust_fn` — trust score feedback function

Pull the applied SQL any time with the Supabase CLI:

```bash
supabase login
supabase db pull --project-ref dqvgjnfyzfsvyzmecqmb
```

The `embed` edge function source is in `supabase/functions/embed/index.ts`.
