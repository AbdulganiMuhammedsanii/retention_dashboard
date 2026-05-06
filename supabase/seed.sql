-- Manzanita org (profiles created on first magic-link login via allowlist bootstrap)
insert into public.organizations (id, name, slug, replacement_cost_cents)
values (
  '00000000-0000-0000-0000-000000000001',
  'Manzanita Security',
  'manzanita',
  350000
)
on conflict (id) do nothing;
