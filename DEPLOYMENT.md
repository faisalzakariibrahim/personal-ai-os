# Deployment — Personal AI OS

## Vercel (recommended, matches your stack)

```bash
npm i -g vercel   # if needed
vercel            # from the project root
```

Set these environment variables in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dqvgjnfyzfsvyzmecqmb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (in `.env.local`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `CEO_MODEL` / `SPECIALIST_MODEL` | optional overrides |
| `OWNER_EMAIL` | your email — the only account allowed in |
| `CRON_SECRET` | long random string — lets Vercel cron hit `/api/briefing` |

Notes:
- `/api/chat` and `/api/simulate` set `maxDuration` (60–120s). On the Vercel Hobby plan functions cap at 60s; if CEO responses time out, reduce delegations or upgrade the plan.

## Auth (built in)

First visit → `/login` → “Set up the owner account” → enter `OWNER_EMAIL` + a password. This creates the Supabase auth user once and links it to your seeded profile. After that it's a normal sign-in; every page and API route rejects anyone who isn't the owner.

## Scheduled morning briefing

`vercel.json` already contains the cron (10:00 UTC = 6:00 AM ET). Set `CRON_SECRET` in Vercel env vars — the middleware admits cron requests carrying `Authorization: Bearer <CRON_SECRET>` (Vercel adds this header automatically when `CRON_SECRET` is set).

## Database

Already live. Migration copies are in `db/migrations/` for version control. To recreate from scratch on a new project, apply them in order: `01_core_schema.sql`, `02_rls_and_search.sql`, `03_seed.sql`, `04_adjust_trust.sql`, then deploy `supabase/functions/embed`.

## Backups & monitoring

- Supabase free tier: daily backups retained 7 days (dashboard → Database → Backups).
- Watch Edge Function logs: dashboard → Edge Functions → embed → Logs.
- The `events` table is your audit log — never delete rows; archive if it grows large.
