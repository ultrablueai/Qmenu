-- G28: isolated Staging founder-offer quota rehearsal, never a payment or entitlement.
-- First 30 distinct Turkish merchants: transactionally allocated simulation slots.
-- Do NOT treat a slot as qualifying for any discount without confirmed paid eligibility.
create table public.beger_tr_founder_dry_run_slots (
  slot smallint primary key check (slot between 1 and 30),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  kind text not null default 'simulation' check (kind='simulation')
);
comment on table public.beger_tr_founder_dry_run_slots is
'G28 internal staging-only simulated Founder Pro allocation. NOT a confirmed payment, promotion reservation, subscription, invoice or right to future discount.';
alter table public.beger_tr_founder_dry_run_slots enable row level security;
revoke all on public.beger_tr_founder_dry_run_slots from public,anon,authenticated;
create or replace function public.beger_g28_founder_dry_run_claim(p_business uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_slot smallint;
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins a
   where a.user_id=v_actor and a.enabled=true and a.role='platform_owner'
 ) then
   raise exception 'Platform owner required for dry run' using errcode='42501';
 end if;
 if p_business is null or not exists (
   select 1 from public.businesses b where b.id=p_business and b.country_code='TR'
 ) then
   raise exception 'Eligible Turkish business required' using errcode='22023';
 end if;
 -- Transaction-scoped serialization prevents two parallel owner sessions claiming slot 30.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:g28:founder:dry-run',0));
 select d.slot into v_slot from public.beger_tr_founder_dry_run_slots d where d.business_id=p_business;
 if found then
  return pg_catalog.jsonb_build_object('slot',v_slot,'duplicate',true,'kind','simulation','billing_enabled',false);
 end if;
 select n::smallint into v_slot from pg_catalog.generate_series(1,30) as n
 where not exists (select 1 from public.beger_tr_founder_dry_run_slots d where d.slot=n)
 order by n limit 1;
 if v_slot is null then
  raise exception 'Founder dry-run capacity exhausted' using errcode='P0001';
 end if;
 insert into public.beger_tr_founder_dry_run_slots(slot,business_id,created_by)
 values(v_slot,p_business,v_actor);
 return pg_catalog.jsonb_build_object('slot',v_slot,'duplicate',false,'kind','simulation','billing_enabled',false);
end;
$$;
revoke all on function public.beger_g28_founder_dry_run_claim(uuid) from public,anon,authenticated;
grant execute on function public.beger_g28_founder_dry_run_claim(uuid) to authenticated;
