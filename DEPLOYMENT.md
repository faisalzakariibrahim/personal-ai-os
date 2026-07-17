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
| `GOOGLE_CLIENT_ID` | optional — Google OAuth client (Calendar + Gmail) |
| `GOOGLE_CLIENT_SECRET` | optional — Google OAuth secret |

### Google connector setup (optional)

1. Google Cloud Console → APIs & Services → enable **Google Calendar API** and **Gmail API**.
2. Credentials → Create OAuth client ID → **Web application**.
3. Authorized redirect URIs:
   - `https://YOUR_DOMAIN/api/connectors/google/callback`
   - `http://localhost:3000/api/connectors/google/callback` (local dev)
4. Put the client ID/secret in env vars, redeploy, then click **Connect Google** in Settings.

Scopes are read-only for Calendar and Gmail, plus `gmail.compose` (drafts only — the app never sends mail; drafts require an approval first).

### Git-based deploys (GitHub → Vercel)

When you connect the GitHub repo, builds run from the repo — where `.env` is gitignored. So **every** variable above must be set in Vercel → Settings → Environment Variables (only `CRON_SECRET` is there so far).

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
