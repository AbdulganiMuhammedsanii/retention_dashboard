# Claude Code Prompt — WatchTower Retention Portal

> Paste this entire document into Claude Code as your initial prompt. Attach `manzanita_retention_dashboard.html` as a reference file in the same conversation. Claude Code will ask the clarifying questions listed at the bottom before scaffolding.

---

## Mission

Build a production-grade web portal for **Manzanita Security** (a California-licensed Private Patrol Operator) so the founder and his team can log in and track workforce retention. The visual brand is **WatchTower** — Manzanita's B2B security operations SaaS — so the aesthetic must feel like a real, polished SaaS product, not an internal admin tool.

This replaces an existing single-file HTML prototype (`manzanita_retention_dashboard.html`) that contains the full calculation logic and aesthetic direction. Port the math and look-and-feel exactly. Replace browser storage with Supabase. Add real auth.

The portal is **single-tenant today** (just Manzanita) but the data model, RLS policies, and routing **must be multi-tenant ready** so a future Phase 3 can onboard additional security companies as paying customers without a rewrite.

---

## Non-negotiable Stack

- **Next.js 15** (App Router, React Server Components, TypeScript strict mode)
- **Supabase** (Postgres + Auth + Row-Level Security + Storage)
- **Tailwind CSS v4**
- **shadcn/ui** for primitive components (button, dialog, input, etc.)
- **Recharts** OR custom SVG for the trend chart (the prototype uses custom SVG — prefer that for design control)
- **Zod** for all form/API validation
- **Vitest** for calculation unit tests
- **pnpm** for package management
- **Railway** for deployment

No Redux. No tRPC. Use Server Actions and Supabase server clients. Keep the dependency tree lean.

---

## Repo Structure

```
/app
  /(auth)
    /login
      page.tsx
    layout.tsx
  /(portal)
    /dashboard
      page.tsx
    /data-entry
      page.tsx
    /sites
      page.tsx
    /settings
      page.tsx
    layout.tsx          # auth-gated, sidebar nav
  /api
    /auth/callback
      route.ts
  layout.tsx            # root, fonts, theme
  page.tsx              # redirects to /dashboard if authed, /login otherwise
  globals.css
/components
  /ui                   # shadcn primitives
  /charts
    trend-chart.tsx     # custom SVG
    site-bars.tsx
  /kpi
    kpi-card.tsx
  /layout
    sidebar.tsx
    topbar.tsx
    logo.tsx
/lib
  /supabase
    client.ts           # browser client
    server.ts           # server client (cookies)
    middleware.ts       # session refresh
  /calc
    retention.ts        # all retention math (mirrors prototype)
    retention.test.ts   # Vitest, validates against prototype outputs
  /types
    db.ts               # generated from Supabase
    domain.ts
/supabase
  /migrations
    20260428000001_init.sql
  /seed.sql
/public
  /fonts
middleware.ts            # Supabase auth middleware
```

---

## Data Model (Supabase migration)

```sql
-- =========================================================
-- Organizations (tenants)
-- =========================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  replacement_cost_cents int not null default 350000, -- $3,500
  created_at timestamptz not null default now()
);

-- =========================================================
-- Profiles (extends auth.users)
-- =========================================================
create type public.user_role as enum ('owner', 'admin', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  email text not null,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles(org_id);

-- =========================================================
-- Sites
-- =========================================================
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  starting_hc int not null default 0 check (starting_hc >= 0),
  departures int not null default 0 check (departures >= 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_org_id_idx on public.sites(org_id);

-- =========================================================
-- Monthly retention records (org-wide rollup)
-- =========================================================
create table public.monthly_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 0 and 11), -- 0=Jan, 11=Dec
  starting_hc int not null default 0 check (starting_hc >= 0),
  new_hires int not null default 0 check (new_hires >= 0),
  departures int not null default 0 check (departures >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, year, month)
);

create index monthly_records_org_year_month_idx
  on public.monthly_records(org_id, year, month);

-- =========================================================
-- Audit log
-- =========================================================
create table public.audit_log (
  id bigserial primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Updated-at triggers
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger sites_touch
  before update on public.sites
  for each row execute function public.touch_updated_at();

create trigger monthly_records_touch
  before update on public.monthly_records
  for each row execute function public.touch_updated_at();
```

### Row-Level Security

```sql
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.monthly_records enable row level security;
alter table public.audit_log enable row level security;

-- Helper: current user's org_id
create or replace function public.current_org_id()
returns uuid language sql stable as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Helper: current user's role
create or replace function public.current_role()
returns public.user_role language sql stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Organizations: members can read their own org
create policy "members read own org" on public.organizations
  for select using (id = public.current_org_id());

create policy "owners update own org" on public.organizations
  for update using (id = public.current_org_id() and public.current_role() = 'owner');

-- Profiles: members read their org's profiles, owners/admins manage
create policy "members read org profiles" on public.profiles
  for select using (org_id = public.current_org_id());

create policy "owners admins manage profiles" on public.profiles
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

-- Sites: read all in org, write requires owner/admin
create policy "read org sites" on public.sites
  for select using (org_id = public.current_org_id());

create policy "write org sites" on public.sites
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

-- Monthly records: same pattern
create policy "read org monthly" on public.monthly_records
  for select using (org_id = public.current_org_id());

create policy "write org monthly" on public.monthly_records
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

-- Audit log: read only, owners only
create policy "owners read audit" on public.audit_log
  for select using (
    org_id = public.current_org_id()
    and public.current_role() = 'owner'
  );
```

### Seed Data

Seed Manzanita's organization and the founder's profile so first-login works:

```sql
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Manzanita Security', 'manzanita');

-- Profiles seeded via Supabase auth on first magic-link login (see auth flow below)
```

---

## Authentication Flow

**Method:** Supabase **Magic Link** only. No passwords. No social auth (yet).

**First-login bootstrap:**

- Hardcode an allowlist of email addresses → org_id mappings in a server-only env var or in a `pending_invites` table for v1.
- On magic-link callback, if no profile exists for the auth.users.id, look up the email in the allowlist, create a profile linked to that org with the assigned role, then redirect to `/dashboard`.
- If email is not in allowlist → show "Access requires an invitation. Contact your administrator." and sign them out.

**Invite flow (Phase 2, not blocking MVP):**

- Owner/admin enters email + role in `/settings/team`
- Server inserts a row into `pending_invites` (new table)
- User receives magic link → on first login, profile auto-created from the invite

For Phase 1 MVP, manually insert allowed emails via SQL or seed file. Document this clearly in the README.

---

## Pages — UX Spec

### `/login`

- Centered card on near-black background with a subtle radial-gradient atmosphere matching the prototype
- WatchTower logomark + wordmark above the form
- Single email input, "Send magic link" button
- After submit: success state ("Check your email") with the option to resend after 30s
- Error states: rate-limit, invalid email, not invited

### `/dashboard` (default authed landing)

Port the HTML prototype 1:1 in structure and aesthetic. Specifically:

1. **Header bar** — WatchTower wordmark + brand mark (left), "UPDATED LIVE" indicator with pulsing green dot + formula pill (right)
2. **KPI strip** (4 cards):
   - Current Month Retention (rust accent stripe)
   - 12-Month Rolling Retention
   - Annualized Turnover (amber accent, shows ± delta vs 121% industry benchmark)
   - Active Headcount (green accent, shows net 12mo change)
3. **Main grid** (1.6fr / 1fr split):
   - Left: 12-month trend chart (custom SVG, rust line, gradient area fill, 88% industry baseline as dashed gray, departure dots in green at chart base)
   - Right: Site list, sorted by retention rate descending, color-coded (green ≥92%, amber 85–92%, red <85%)
4. **Context grid** (2 columns):
   - Industry Benchmark with horizontal scale bar (BLS / ASIS sources cited)
   - Cost of Turnover with editable replacement cost input
5. **Methodology** expandable section at the bottom

**Data fetching:** Server Component fetches all data in parallel (sites, monthly records, org settings) and passes to a client component for the editable parts. Use Suspense boundaries.

### `/data-entry`

Editable monthly grid — port from prototype:

| Month | Starting HC | New Hires | Departures | Ending HC (calc) | Retention % (calc) | Net Change (calc) |
| ----- | ----------- | --------- | ---------- | ---------------- | ------------------ | ----------------- |

- Inline editable inputs
- Auto-save with 500ms debounce → Server Action → upsert to Supabase
- Save status indicator ("Saving…" / "✓ Saved")
- "+ Add Month" button (appends next chronological month)
- "Reset Data" with confirmation dialog (clears monthly_records for org, keeps sites)

### `/sites`

- Table of sites with inline-editable name, starting_hc, departures
- "+ Add Site" creates a new row
- Soft-delete via `active = false`
- Per-site retention computed in JS, displayed inline
- Sortable by name or retention

### `/settings`

- Org name (owner-editable)
- Replacement cost per guard (admin+ editable, dollar input)
- **Team** section (Phase 2): list of profiles, invite-by-email form
- Sign out

---

## Branding — WatchTower Visual Language

**Important:** Chris has not yet provided final WatchTower brand assets. Use the prototype's palette as the v1 baseline and **prompt Chris for actual WatchTower logo + brand colors** before the final styling pass.

### CSS Variables (initial defaults — match prototype)

```css
:root {
  --bg: #0a0b0d;
  --panel: #131519;
  --panel-elevated: #1a1d23;
  --border: #23272f;
  --border-strong: #353a45;
  --text: #eceef2;
  --text-muted: #8b919c;
  --text-faint: #545a65;
  --accent: #ea580c; /* rust — replace with WatchTower primary if different */
  --accent-soft: #c2410c;
  --success: #10b981;
  --danger: #ef4444;
  --warn: #f59e0b;
}
```

### Typography

- **Display** — `Bricolage Grotesque` (variable, weights 400/500/700)
- **Body** — `Manrope` (400/500/600/700)
- **Mono** — `JetBrains Mono` (400/500/600) — used for numbers, eyebrows, labels in caps

Self-host fonts via `next/font/google` for performance.

### Voice + Detail Rules

- All eyebrow/section labels in **mono caps with letter-spacing 0.15em** (e.g. `ACTIVE GUARDS · 12MO ROLLING`)
- KPI numbers in display font, large, slight negative letter-spacing
- Subtle motion only: status pulse, hover lifts (translateY -1px), tab transitions
- No emoji decoration. No purple gradients. No generic SaaS pastels.
- Background: deep charcoal with two faint radial gradients (rust top-left, green bottom-right) — matches prototype

---

## Calculation Library (`/lib/calc/retention.ts`)

These must produce **byte-identical outputs** to the HTML prototype for the same inputs. Validated by unit tests.

```ts
export type MonthlyRecord = {
  year: number;
  month: number; // 0–11
  startingHc: number;
  newHires: number;
  departures: number;
};

export const retentionPct = (hc: number, departures: number): number | null =>
  hc > 0 ? ((hc - departures) / hc) * 100 : null;

export const endingHc = (r: MonthlyRecord): number =>
  r.startingHc + r.newHires - r.departures;

export const netChange = (r: MonthlyRecord): number => r.newHires - r.departures;

export const hasData = (r: MonthlyRecord): boolean =>
  (Number.isFinite(r.startingHc) && r.startingHc !== 0) ||
  r.newHires + r.departures > 0;

/** Compounded 12-month rolling retention (product of monthly retention rates) */
export const rolling12 = (rows: MonthlyRecord[]): number | null => {
  const filled = rows.filter((r) => r.startingHc > 0);
  if (filled.length === 0) return null;
  return (
    filled.reduce((acc, r) => {
      const ret = retentionPct(r.startingHc, r.departures) ?? 100;
      return acc * (ret / 100);
    }, 1) * 100
  );
};

/** Annualized turnover: (avg monthly departures × 12) / avg headcount */
export const annualizedTurnover = (rows: MonthlyRecord[]): number | null => {
  const filled = rows.filter((r) => r.startingHc > 0);
  if (filled.length === 0) return null;
  const totalDep = filled.reduce((s, r) => s + r.departures, 0);
  const avgHc = filled.reduce((s, r) => s + r.startingHc, 0) / filled.length;
  if (avgHc <= 0) return null;
  return (((totalDep / filled.length) * 12) / avgHc) * 100;
};

export const totalDepartures12mo = (rows: MonthlyRecord[]): number =>
  rows.filter((r) => r.startingHc > 0).reduce((s, r) => s + r.departures, 0);

export const turnoverCost = (
  departures: number,
  replacementCostCents: number
): number => departures * (replacementCostCents / 100);
```

### Required tests (`retention.test.ts`)

- 12 months with stable HC=50 and 4 departures/month → annualized turnover = 96%
- HC=0 → retentionPct returns null (not NaN, not 0, not Infinity)
- Empty rows → all aggregate functions return null cleanly
- Partial-year data (e.g. 6 months) → annualizedTurnover annualizes correctly
- Compare 5 hand-calculated scenarios against the HTML prototype's output

---

## Quality Gates

- **TypeScript strict** mode, zero `any`, zero `@ts-ignore`
- **ESLint** with `next/core-web-vitals` + `@typescript-eslint/strict`
- **Prettier** on commit (Husky + lint-staged)
- All Server Actions wrapped in try/catch with typed errors
- All forms validated client-side (Zod) AND server-side (same schemas)
- All Supabase queries go through helper functions in `/lib/supabase/queries/*` — no inline `from('...').select()` in components
- **Lighthouse** mobile + desktop scores ≥ 95 on `/dashboard`
- **No console errors** in production build
- All RLS policies tested with at least 2 fake orgs to verify isolation

---

## Phased Build Plan

### Phase 1 — MVP (this build)

1. Scaffold Next.js + Supabase + Tailwind + shadcn
2. Run migrations against Supabase project
3. Auth flow (login → magic link → callback → profile bootstrap)
4. `/dashboard` wired to live Supabase data
5. `/data-entry` with Server Action saves
6. `/sites` CRUD
7. `/settings` (org name, replacement cost)
8. Manzanita org seeded; allowlist of authorized emails
9. Deploy to Railway
10. Smoke-test end-to-end

### Phase 2 — Polish (do not build yet, document only)

- In-app team invite flow with `pending_invites` table
- CSV export of monthly_records
- Audit log viewer for owners
- Weekly email digest via Supabase scheduled function

### Phase 3 — Multi-tenant (future)

- Public marketing landing page at `/`
- Self-serve org signup
- Stripe billing per org
- Per-tenant subdomain or path-based routing

Build Phase 1 only. Stub Phase 2 hooks where natural (e.g. invite UI in /settings can show "Coming soon").

---

## Acceptance Criteria

- [ ] Magic-link login works end-to-end on Railway deployment
- [ ] Non-allowlisted emails are rejected with a clear message
- [ ] Dashboard renders with real Supabase data
- [ ] All four KPIs match the HTML prototype's outputs for the same inputs (validated by unit tests)
- [ ] Trend chart renders correctly with 12mo of data; handles empty state gracefully
- [ ] Data entry auto-saves and persists across sessions
- [ ] RLS verified: a manually-inserted second org cannot see Manzanita's data
- [ ] Replacement cost change in /settings updates the cost panel on /dashboard
- [ ] Mobile responsive (single column ≤ 640px, two-column ≤ 1100px)
- [ ] No `any` types, zero ESLint warnings, zero console errors
- [ ] README with setup, env vars, deploy, and "how to invite a teammate"
- [ ] Lighthouse ≥ 95 on /dashboard

---

## What to Ask Chris Before Starting

Ask these in order. Do not start scaffolding until you have answers:

1. **Supabase project** — it is manzanita-ops project under my account. when it gets to this part, i can do the supabase link and migrations manually.

2. **WatchTower brand assets** — do you have a final logo (SVG preferred), wordmark, and brand color palette? If not, I'll proceed with the prototype's rust-on-charcoal palette and a placeholder "WT" logomark, and we'll do a branding pass before launch.

3. **Authorized emails for first deploy** — list of email addresses (and their role: owner / admin / viewer) that should be able to log in immediately. Abdul & Chris's email should be `owner` Abdul email is abdulgani.muhammedsani@gmail.com. Chris's email is ceggers@manzanita.io

4. **Domain** — where should this deploy? Options: (a) `app.manzanitasecurity.io`, (b) `retention.manzanitasecurity.io`, (c) Railway default URL for now and we'll wire DNS later. If unsure, deploy to Railway default and document the DNS swap.

5. **Replacement cost default** — confirm $3,500/guard or change.

6. **Existing Manzanita data** — should I import any historical retention data on first deploy, or start from a clean slate? If importing, attach a CSV with columns: year, month, starting_hc, new_hires, departures.

---

## Reference Files

- `manzanita_retention_dashboard.html` — single-file HTML prototype with full calculation logic, visual aesthetic, and the exact KPI/chart/table layouts to port. **Read this first** before scaffolding. Match its outputs exactly.

---

## Final Notes

- **Be honest in code comments** about formula limitations (voluntary vs involuntary departures aren't distinguished — note this in the Methodology page)
- **Cite sources** in the UI text where industry numbers are referenced (BLS JOLTS, ASIS Workforce Survey 2023, SHRM Human Capital Benchmarking) — Chris values pointing to data
- **Don't add features not specified here.** If something feels missing, propose it in a comment or follow-up question, don't silently add it
- **Match the prototype's density and tone** — Chris prefers dense, mono-typeset numerical tables over airy whitespace
- **Quality over speed** — get it right, ship it once
