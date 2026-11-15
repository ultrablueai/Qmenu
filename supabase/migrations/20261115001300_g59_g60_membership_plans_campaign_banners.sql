-- Beger G59/G60: owner-authored membership plans and public on-site banners.
-- Checkout/renewal and outbound marketing remain OFF until separate integrations and consent gates.
create table if not exists public.salon_membership_plans (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null check(length(name) between 2 and 90),
 description text not null default '',
 price_minor bigint not null check(price_minor>=0 and price_minor<=100000000),
 currency char(3) not null default 'TRY',
 cycle_months integer not null check(cycle_months in (1,3,6,12)),
 included_visits integer not null check(included_visits between 1 and 40),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id)
);
create table if not exists public.salon_campaign_banners (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 title text not null check(length(title) between 4 and 100),
 description text not null default '' check(length(description)<=350),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '90 days')
);
alter table public.salon_membership_plans enable row level security;
alter table public.salon_campaign_banners enable row level security;
revoke all on public.salon_membership_plans,public.salon_campaign_banners from public,anon,authenticated;

create or replace function public.beger_g59_g60_owner_marketing(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or not exists(select 1 from public.memberships
 where business_id=p_business and user_id=v_actor and role='owner') then
 raise exception 'Only salon owner can view marketing setup' using errcode='42501';end if;
 return pg_catalog.jsonb_build_object('business_id',p_business,
 'plans',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',p.id,'name',p.name,'description',p.description,'price_minor',p.price_minor,
  'cycle_months',p.cycle_months,'included_visits',p.included_visits,'published',p.published)
  order by p.created_at desc) from public.salon_membership_plans p
  where p.business_id=p_business),'[]'::jsonb),
 'banners',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',c.id,'title',c.title,'description',c.description,
  'starts_at',c.starts_at,'ends_at',c.ends_at,'published',c.published)
  order by c.created_at desc) from public.salon_campaign_banners c
  where c.business_id=p_business),'[]'::jsonb),
 'membership_checkout_enabled',false,'outbound_marketing_enabled',false);
end;
$$;
revoke all on function public.beger_g59_g60_owner_marketing(uuid) from public,anon,authenticated;
grant execute on function public.beger_g59_g60_owner_marketing(uuid) to authenticated;

create or replace function public.beger_g59_upsert_membership_plan(
 p_business uuid,p_plan uuid,p_name text,p_description text,
 p_price_minor bigint,p_cycle_months integer,p_included_visits integer,p_published boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.memberships
  where business_id=p_business and user_id=v_actor and role='owner') then
  raise exception 'Only salon owner can set membership plans' using errcode='42501';end if;
 if length(pg_catalog.btrim(coalesce(p_name,''))) not between 2 and 90 or
  length(coalesce(p_description,''))>350 or
  p_price_minor is null or p_price_minor not between 0 and 100000000 or
  p_cycle_months is null or p_cycle_months not in (1,3,6,12) or
  p_included_visits is null or p_included_visits not between 1 and 40 or
  p_published is null then
  raise exception 'Invalid membership plan configuration' using errcode='22023';end if;
 if p_plan is not null and not exists(select 1 from public.salon_membership_plans
 where business_id=p_business and id=p_plan) then
  raise exception 'Membership plan does not belong to this salon' using errcode='42501';end if;
 if p_plan is null then
  insert into public.salon_membership_plans
   (business_id,name,description,price_minor,cycle_months,included_visits,published)
  values(p_business,pg_catalog.btrim(p_name),coalesce(p_description,''),p_price_minor,
    p_cycle_months,p_included_visits,p_published)
  returning id into v_id;
 else
  update public.salon_membership_plans set name=pg_catalog.btrim(p_name),
   description=coalesce(p_description,''),price_minor=p_price_minor,cycle_months=p_cycle_months,
   included_visits=p_included_visits,published=p_published,updated_at=now()
  where business_id=p_business and id=p_plan returning id into v_id;
 end if;
 return pg_catalog.jsonb_build_object('plan_id',v_id,'published',p_published,
 'checkout_enabled',false,'auto_renewal_enabled',false);
end;
$$;
revoke all on function public.beger_g59_upsert_membership_plan(uuid,uuid,text,text,bigint,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.beger_g59_upsert_membership_plan(uuid,uuid,text,text,bigint,integer,integer,boolean) to authenticated;

create or replace function public.beger_g60_upsert_banner(
 p_business uuid,p_banner uuid,p_title text,p_description text,
 p_starts_at timestamptz,p_ends_at timestamptz,p_published boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.memberships
 where business_id=p_business and user_id=v_actor and role='owner') then
  raise exception 'Only salon owner can publish banners' using errcode='42501';end if;
 if length(pg_catalog.btrim(coalesce(p_title,''))) not between 4 and 100 or
  length(coalesce(p_description,''))>350 or p_starts_at is null or p_ends_at is null or
  p_ends_at<=p_starts_at or p_ends_at>p_starts_at+interval '90 days' or
  p_published is null then
   raise exception 'Invalid campaign window or content' using errcode='22023';end if;
 if p_banner is not null and not exists(select 1 from public.salon_campaign_banners
   where business_id=p_business and id=p_banner) then
  raise exception 'Campaign does not belong to this salon' using errcode='42501';end if;
 if p_banner is null then
  insert into public.salon_campaign_banners
   (business_id,title,description,starts_at,ends_at,published)
  values(p_business,pg_catalog.btrim(p_title),coalesce(p_description,''),
   p_starts_at,p_ends_at,p_published) returning id into v_id;
 else
  update public.salon_campaign_banners set title=pg_catalog.btrim(p_title),
  description=coalesce(p_description,''),starts_at=p_starts_at,ends_at=p_ends_at,
  published=p_published,updated_at=now()
  where business_id=p_business and id=p_banner returning id into v_id;
 end if;
 return pg_catalog.jsonb_build_object('banner_id',v_id,'published',p_published,
   'outbound_notifications_enabled',false);
end;
$$;
revoke all on function public.beger_g60_upsert_banner(uuid,uuid,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.beger_g60_upsert_banner(uuid,uuid,text,text,timestamptz,timestamptz,boolean) to authenticated;

create or replace function public.beger_g59_g60_public_promotions(p_slug text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;
begin
 select business_id into v_business from public.salon_public_links
 where slug=p_slug and published;
 if v_business is null then raise exception 'Salon not published' using errcode='22023';end if;
 return pg_catalog.jsonb_build_object(
 'plans',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',p.id,'name',p.name,'description',p.description,
  'price_minor',p.price_minor,'currency',p.currency,
  'cycle_months',p.cycle_months,'included_visits',p.included_visits)
  order by p.price_minor) from public.salon_membership_plans p
  where p.business_id=v_business and p.published),'[]'::jsonb),
 'banners',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',c.id,'title',c.title,'description',c.description)
  order by c.created_at desc) from public.salon_campaign_banners c
  where c.business_id=v_business and c.published and
   c.starts_at<=now() and c.ends_at>now()),'[]'::jsonb),
 'membership_checkout_enabled',false,'marketing_push_enabled',false);
end;
$$;
revoke all on function public.beger_g59_g60_public_promotions(text) from public,anon,authenticated;
grant execute on function public.beger_g59_g60_public_promotions(text) to anon,authenticated;
