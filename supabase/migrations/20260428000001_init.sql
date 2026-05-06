-- WatchTower Retention Portal — initial schema (multi-tenant ready)
-- Idempotent: safe to re-run when objects already exist (partial applies / retries).

-- =========================================================
-- Enum
-- =========================================================
do $$
begin
  create type public.user_role as enum ('owner', 'admin', 'viewer');
exception
  when duplicate_object then null;
end $$;

-- =========================================================
-- Organizations (tenants)
-- =========================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  replacement_cost_cents int not null default 350000,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Profiles (extends auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  email text not null,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_id_idx on public.profiles(org_id);

-- =========================================================
-- Sites (ops snapshot; table name sites_ops)
-- =========================================================
create table if not exists public.sites_ops (
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

create index if not exists sites_ops_org_id_idx on public.sites_ops(org_id);

-- =========================================================
-- Monthly retention records (org-wide rollup)
-- =========================================================
create table if not exists public.monthly_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 0 and 11),
  starting_hc int check (starting_hc is null or starting_hc >= 0),
  new_hires int not null default 0 check (new_hires >= 0),
  departures int not null default 0 check (departures >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, year, month)
);

create index if not exists monthly_records_org_year_month_idx
  on public.monthly_records(org_id, year, month);

-- =========================================================
-- Audit log
-- =========================================================
create table if not exists public.audit_log (
  id bigserial primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Legacy public.audit_log (e.g. other Supabase templates) may omit portal columns; CREATE above skips.
alter table public.audit_log add column if not exists org_id uuid references public.organizations(id) on delete cascade;
alter table public.audit_log add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.audit_log add column if not exists action text;
alter table public.audit_log add column if not exists entity_type text;
alter table public.audit_log add column if not exists entity_id uuid;
alter table public.audit_log add column if not exists payload jsonb;
alter table public.audit_log add column if not exists created_at timestamptz;

-- =========================================================
-- Updated-at triggers
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

do $$
begin
  if to_regclass('public.sites_ops') is not null then
    execute 'drop trigger if exists sites_ops_touch on public.sites_ops';
    execute 'create trigger sites_ops_touch before update on public.sites_ops for each row execute function public.touch_updated_at()';
  end if;
  if to_regclass('public.monthly_records') is not null then
    execute 'drop trigger if exists monthly_records_touch on public.monthly_records';
    execute 'create trigger monthly_records_touch before update on public.monthly_records for each row execute function public.touch_updated_at()';
  end if;
end $$;

-- =========================================================
-- Row-Level Security
-- =========================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.sites_ops enable row level security;
alter table public.monthly_records enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_org_id()
returns uuid language sql stable security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns public.user_role language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "members read own org" on public.organizations;
create policy "members read own org" on public.organizations
  for select using (id = public.current_org_id());

drop policy if exists "owners and admins update own org" on public.organizations;
create policy "owners and admins update own org" on public.organizations
  for update using (
    id = public.current_org_id()
    and public.current_role() in ('owner', 'admin')
  );

drop policy if exists "members read org profiles" on public.profiles;
create policy "members read org profiles" on public.profiles
  for select using (org_id = public.current_org_id());

drop policy if exists "owners admins manage profiles" on public.profiles;
create policy "owners admins manage profiles" on public.profiles
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

drop policy if exists "read org sites_ops" on public.sites_ops;
create policy "read org sites_ops" on public.sites_ops
  for select using (org_id = public.current_org_id());

drop policy if exists "write org sites_ops" on public.sites_ops;
create policy "write org sites_ops" on public.sites_ops
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

drop policy if exists "read org monthly" on public.monthly_records;
create policy "read org monthly" on public.monthly_records
  for select using (org_id = public.current_org_id());

drop policy if exists "write org monthly" on public.monthly_records;
create policy "write org monthly" on public.monthly_records
  for all using (
    org_id = public.current_org_id()
    and public.current_role() in ('owner','admin')
  );

drop policy if exists "owners read audit" on public.audit_log;
create policy "owners read audit" on public.audit_log
  for select using (
    org_id = public.current_org_id()
    and public.current_role() = 'owner'
  );
