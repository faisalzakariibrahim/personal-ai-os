# Contributing

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
npm run dev                  # http://localhost:3000
```

First run: open `/login` → "Set up the owner account" → enter `OWNER_EMAIL` + a password (8+ chars). One-time only.

## Before opening a PR

Run the same checks CI runs:

```bash
npm run typecheck
npm test
npm run build
```

## Conventions

- **Never commit secrets.** `.env.local` is gitignored; use `.env.example` as the template.
- Agents recommend and prepare — they never execute external actions without an approval. Any new capability that spends money, sends messages, or writes to an external system must route through the approval engine (`src/lib/approvals.ts`).
- Memory access is permission-scoped (`src/lib/permissions.ts`). New agents get least-privilege permissions only.
- Risk level 4 (bank transfers, legal, identity) is never executed by the system — keep it that way.

## Architecture

See `README.md` for the module map, `SECURITY.md` for the threat model, and `DEPLOYMENT.md` for shipping to Vercel.
