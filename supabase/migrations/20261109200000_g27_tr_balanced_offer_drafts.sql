-- G27: Beger Balanced Turkey offer book. Proposal only: NEVER activates billing or entitlements.
-- Owner approved provisional figures on 2026-11-09; no PSP/legal/tax certification.
create table public.beger_tr_offer_drafts (
 code text primary key check(code in ('start','pro','business')),
 name text not null,
 currency text not null default 'TRY' check(currency='TRY'),
 monthly_gross_minor bigint not null check(monthly_gross_minor>0),
 annual_gross_minor bigint not null check(annual_gross_minor>0),
 trial_days integer not null default 14 check(trial_days=14),
 included_branches integer not null check(included_branches between 1 and 2),
 assumed_kdv_basis_points integer not null default 2000 check(assumed_kdv_basis_points=2000),
 promo_monthly_gross_minor bigint,
 promo_max_merchants integer,
 promo_months integer,
 published boolean not null default false check (published=false),
 billing_enabled boolean not null default false check (billing_enabled=false),
 updated_at timestamptz not null default now(),
 check (
  (code='pro' and promo_monthly_gross_minor=79900 and promo_max_merchants=30 and promo_months=6)
  or (code<>'pro' and promo_monthly_gross_minor is null and promo_max_merchants is null and promo_months is null)
 )
);
comment on table public.beger_tr_offer_drafts is 'Owner-approved provisional Turkey gross-inclusive price proposals, not published rates, tax certification, subscriptions, entitlements, invoices or actual promo allocations.';
alter table public.beger_tr_offer_drafts enable row level security;
revoke all on public.beger_tr_offer_drafts from public,anon,authenticated;
grant select(code,name,currency,monthly_gross_minor,annual_gross_minor,trial_days,included_branches,assumed_kdv_basis_points,promo_monthly_gross_minor,promo_max_merchants,promo_months,published,billing_enabled,updated_at)
on public.beger_tr_offer_drafts to authenticated;
create policy beger_tr_offer_platform_read on public.beger_tr_offer_drafts
for select to authenticated using (
 exists(select 1 from public.platform_admins a
  where a.user_id=(select auth.uid()) and a.enabled=true
   and a.role in ('platform_owner','platform_operator'))
);
insert into public.beger_tr_offer_drafts
 (code,name,monthly_gross_minor,annual_gross_minor,included_branches,promo_monthly_gross_minor,promo_max_merchants,promo_months)
values
 ('start','Beger Start',39900,399000,1,null,null,null),
 ('pro','Beger Pro',99900,999000,1,79900,30,6),
 ('business','Beger Business',179900,1799000,2,null,null,null);
