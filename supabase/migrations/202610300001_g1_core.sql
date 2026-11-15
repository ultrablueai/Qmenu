-- G1 core foundation. Review on isolated STAGING before applying.
-- No client-side creation of tenants, branches, staff or plans.
create extension if not exists pgcrypto;
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  country_code text not null check (country_code in ('TR','SY')),
  created_at timestamptz not null default now()
);
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  unique (business_id, id)
);
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index memberships_user_business_idx on public.memberships(user_id,business_id);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null check (status in ('trial','active','past_due','expired','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index branches_business_idx on public.branches(business_id);
create index subscriptions_business_idx on public.subscriptions(business_id);
create index audit_logs_business_created_idx on public.audit_logs(business_id,created_at desc);

alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.memberships enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

-- Revoke public API privileges by default. Explicit reads are granted only to authenticated.
revoke all on public.businesses, public.branches, public.memberships,
 public.plans, public.subscriptions, public.audit_logs from anon, authenticated;
grant select on public.businesses, public.branches, public.memberships,
 public.plans, public.subscriptions to authenticated;

-- Membership rows are visible only to the user themselves.
create policy memberships_self_read on public.memberships
 for select to authenticated using (user_id = (select auth.uid()));
create policy businesses_member_read on public.businesses
 for select to authenticated using (exists (
  select 1 from public.memberships m
  where m.business_id = businesses.id and m.user_id = (select auth.uid())
 ));
create policy branches_member_read on public.branches
 for select to authenticated using (exists (
  select 1 from public.memberships m
  where m.business_id = branches.business_id and m.user_id = (select auth.uid())
 ));
create policy subscriptions_member_read on public.subscriptions
 for select to authenticated using (exists (
  select 1 from public.memberships m
  where m.business_id = subscriptions.business_id and m.user_id = (select auth.uid())
 ));
create policy plans_authenticated_read on public.plans
 for select to authenticated using (true);

-- Deliberate deny-by-default: no client INSERT/UPDATE/DELETE policy, and no audit log SELECT.
-- Bootstrap must happen through independently authenticated and authorized server operations.
