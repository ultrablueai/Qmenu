-- G31: choose a Turkey SaaS plan for human review; no payment, subscription grant, or invoice.
-- Only isolated Beger Staging; retains G13 queue uniqueness and audit rules.
insert into public.plans(code,name,active)
select o.code,o.name,true from public.beger_tr_offer_drafts o
where o.code in ('start','pro','business')
on conflict (code) do nothing;

alter table public.g13_subscription_requests
 add column requested_plan_code text
  check(requested_plan_code is null or requested_plan_code in ('start','pro','business')),
 add column requested_period text
  check(requested_period is null or requested_period in ('monthly','yearly'));

create or replace function public.beger_g31_merchant_offer_catalog(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if (select auth.uid()) is null or p_business is null or not exists (
   select 1 from public.memberships m
   where m.business_id=p_business and m.user_id=(select auth.uid()) and m.role in ('owner','manager')
 ) then raise exception 'Merchant catalog forbidden' using errcode='42501'; end if;
 if not exists(select 1 from public.businesses b where b.id=p_business and b.country_code='TR') then
  raise exception 'Turkey-only offer catalog' using errcode='22023';
 end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'code',o.code,'name',o.name,'currency',o.currency,
  'monthlyGrossMinor',o.monthly_gross_minor,'annualGrossMinor',o.annual_gross_minor,
  'trialDays',o.trial_days,'includedBranches',o.included_branches,
  'promoMonthlyGrossMinor',o.promo_monthly_gross_minor,
  'promoMonths',o.promo_months,'promoMaxMerchants',o.promo_max_merchants,
  'published',o.published,'billingEnabled',o.billing_enabled
 ) order by o.monthly_gross_minor),'[]'::jsonb)
 into v_result from public.beger_tr_offer_drafts o;
 return v_result;
end;
$$;
revoke all on function public.beger_g31_merchant_offer_catalog(uuid) from public,anon,authenticated;
grant execute on function public.beger_g31_merchant_offer_catalog(uuid) to authenticated;

create or replace function public.beger_g31_request_plan(
 p_business uuid,p_plan_code text,p_period text,p_trial boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_code text;v_request uuid;v_kind text;
begin
 if v_actor is null or p_business is null or not exists(
  select 1 from public.memberships m where m.user_id=v_actor and m.business_id=p_business and m.role='owner'
 ) then raise exception 'Business owner required' using errcode='42501';end if;
 if not exists(select 1 from public.businesses b where b.id=p_business and b.country_code='TR') then
  raise exception 'Turkey-only offer' using errcode='22023';
 end if;
 v_code:=lower(trim(coalesce(p_plan_code,'')));
 if v_code not in ('start','pro','business')
    or p_period not in ('monthly','yearly') or p_trial is null then
   raise exception 'Invalid plan selection' using errcode='22023';
 end if;
 if not exists(select 1 from public.beger_tr_offer_drafts o where o.code=v_code and o.published=false and o.billing_enabled=false)
    or not exists(select 1 from public.plans p where p.code=v_code and p.active) then
  raise exception 'Plan unavailable for staging review' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:subscription_request:'||p_business::text,0));
 if exists(select 1 from public.g13_subscription_requests r where r.business_id=p_business and r.status='pending') then
   raise exception 'Pending review already exists' using errcode='23505';
 end if;
 if p_trial then
  if exists(select 1 from public.subscriptions s where s.business_id=p_business) then
   raise exception 'Trial only for merchants without subscription history' using errcode='22023';
  end if;
  v_kind:='trial';
 else
  v_kind:='plan_review';
 end if;
 insert into public.g13_subscription_requests
  (business_id,requested_by,kind,requested_plan_code,requested_period)
 values(p_business,v_actor,v_kind,v_code,p_period) returning id into v_request;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'merchant_plan_selection_requested','subscription_request',v_request,
  pg_catalog.jsonb_build_object('business_id',p_business,'plan',v_code,'period',p_period,'trial',p_trial));
 return pg_catalog.jsonb_build_object(
 'id',v_request,'status','pending','plan',v_code,'period',p_period,
 'trial_requested',p_trial,'billing_enabled',false,'subscription_activated',false);
end;
$$;
revoke all on function public.beger_g31_request_plan(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.beger_g31_request_plan(uuid,text,text,boolean) to authenticated;

-- Add selection details to the existing authorized queue APIs.
create or replace function public.g13_merchant_requests(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists (
  select 1 from public.memberships m where m.business_id=p_business and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Merchant subscription requests forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',r.id,'kind',r.kind,'status',r.status,'createdAt',r.created_at,'reviewedAt',r.reviewed_at,
  'planCode',r.requested_plan_code,'period',r.requested_period
 ) order by r.created_at desc),'[]'::jsonb)
 into v_result from (
  select id,kind,status,created_at,reviewed_at,requested_plan_code,requested_period
  from public.g13_subscription_requests
  where business_id=p_business order by created_at desc limit 25
 ) r;
 return v_result;
end $$;

create or replace function public.g13_platform_request_queue()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists (
  select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled=true
  and p.role in ('platform_owner','platform_operator')
 ) then raise exception 'Platform subscription queue forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',r.id,'businessId',r.business_id,'businessName',r.business_name,
  'kind',r.kind,'status',r.status,'createdAt',r.created_at,
  'planCode',r.requested_plan_code,'period',r.requested_period
 ) order by r.created_at desc),'[]'::jsonb) into v_result
 from (
  select sr.id,sr.business_id,b.name as business_name,sr.kind,sr.status,sr.created_at,
    sr.requested_plan_code,sr.requested_period
  from public.g13_subscription_requests sr join public.businesses b on b.id=sr.business_id
  order by case when sr.status='pending' then 0 else 1 end,sr.created_at desc limit 100
 ) r;
 return v_result;
end $$;
