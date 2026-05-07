# WatchTower Retention Portal

Next.js 15 + Supabase (Postgres, Auth, RLS) portal for Manzanita Security workforce retention tracking.

## Prerequisites

- Node 20+ (LTS recommended; Node 25 + npm 11 can hit resolver bugs — use Node 22 LTS if `npm install` fails)
- npm 9+ (ships with Node)
- Supabase project (you run `supabase link` and migrations locally)

### npm install troubleshooting

1. **Use only npm in this repo** — delete `pnpm-lock.yaml` if it exists (npm should not mix with pnpm lockfiles).
2. **Clean install:**  
   `rm -rf node_modules package-lock.json && npm cache clean --force && npm install`
3. If you still see `Cannot read properties of null (reading 'matches')` or a **parent folder** has its own `package-lock.json`, run install from this directory only or temporarily rename the parent lockfile so npm does not pick the wrong workspace root.
4. Optional: `npm install --legacy-peer-deps` if peer dependency resolution errors appear.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

| Variable                        | Description                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key — **server only**, used for first-login profile bootstrap                |
| `ALLOWLIST_EMAILS`              | Comma-, semicolon-, or newline-separated emails that may sign in                          |
| `ALLOWLIST_ORG_ID`              | UUID of `public.organizations` row for every allowlisted user (see seed)                  |
| `ALLOWLIST_ROLE`                | Optional. `owner` \| `admin` \| `viewer` for **all** allowlisted emails (default `owner`) |
| `NEXT_PUBLIC_SITE_URL`          | Base URL for magic-link redirect (e.g. `https://your-app.up.railway.app`)                 |

Example (three people, same org, all owners):

```bash
ALLOWLIST_EMAILS=you@company.com,colleague@company.com,boss@company.com
ALLOWLIST_ORG_ID=00000000-0000-0000-0000-000000000001
ALLOWLIST_ROLE=owner
```

## Database

1. Apply migrations in [`supabase/migrations/`](supabase/migrations/) in order (init creates `sites_ops`; a later migration renames legacy `sites` → `sites_ops` if needed).
2. Optionally run seed: [`supabase/seed.sql`](supabase/seed.sql) (Manzanita org row)

## How to invite a teammate (Phase 1)

1. Add their work email to `ALLOWLIST_EMAILS` (comma-separated list). Everyone uses the same `ALLOWLIST_ORG_ID` and `ALLOWLIST_ROLE` in Phase 1.
2. Redeploy or update the env var on Railway and restart the service.
3. They request a magic link on `/login`.

Phase 2 will add in-app invites (`pending_invites`).

## Importing historical `monthly_records` (CSV)

Expected columns: `year`, `month` (0–11), `starting_hc`, `new_hires`, `departures`.

Use the Supabase SQL editor or `psql` after transforming CSV to `INSERT` statements, for example:

```sql
insert into public.monthly_records (org_id, year, month, starting_hc, new_hires, departures)
values ('00000000-0000-0000-0000-000000000001', 2024, 0, 48, 2, 3);
```

`starting_hc` may be `NULL` for months with no starting HC entered yet.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint
- `npm test` — Vitest (retention math)
- `npm run format` — Prettier

## RLS isolation check

1. Create a second organization and a second test user profile in SQL (different `org_id`).
2. Sign in as that user and confirm `/dashboard` shows no Manzanita rows (queries return only `current_org_id()` data).

## Deploy (Railway)

1. Create a Railway service from this repo; set build command `npm run build` and start command `npm start`.
2. Add the same env vars as in `.env.example`.
3. In Supabase Auth → URL configuration, add redirect URL: `{NEXT_PUBLIC_SITE_URL}/api/auth/callback`.

Default Phase 1 deploy can stay on the Railway-generated URL; swap DNS later if needed.
