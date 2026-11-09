-- G30: enforce Turkey 14-day trials without changing legacy Syrian pilot options.
-- No DML. Existing trial rows stay unchanged. Stage only.
CREATE OR REPLACE FUNCTION public.platform_owner_start_trial(p_business uuid, p_plan uuid, p_days integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid := (select auth.uid()); v_trial uuid; v_code text;
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins pa
   where pa.user_id=v_actor and pa.enabled=true and pa.role='platform_owner'
 ) then raise exception 'platform owner required' using errcode='42501'; end if;
 if p_business is null or p_plan is null or p_days is null or p_days not in (7,14,30) then
   raise exception 'invalid trial input' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:trial:'||p_business::text,0));
 if not exists (select 1 from public.businesses b where b.id=p_business) then
   raise exception 'business not found' using errcode='22023'; end if;
 -- Turkey: owner-approved trials must last exactly 14 days.
 if exists(select 1 from public.businesses b where b.id=p_business and b.country_code='TR')
    and p_days<>14 then
   raise exception 'Turkey trials must last exactly 14 days' using errcode='22023';
 end if;
 select code into v_code from public.plans where id=p_plan and active=true;
 if v_code is null then raise exception 'active plan required' using errcode='22023'; end if;
 -- One trial ever for each merchant under current pilot policy. Existing subscriptions
 -- of any status must not be silently replaced, extended or overwritten.
 if exists (select 1 from public.subscriptions s where s.business_id=p_business) then
   raise exception 'business already has a subscription history' using errcode='23505'; end if;
 insert into public.subscriptions(business_id,plan_id,status,starts_at,ends_at)
 values(p_business,p_plan,'trial',now(),now()+pg_catalog.make_interval(days=>p_days))
 returning id into v_trial;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'merchant_trial_started','subscription',v_trial,
  pg_catalog.jsonb_build_object('business_id',p_business,'plan_id',p_plan,'plan_code',v_code,'duration_days',p_days));
 return v_trial;
end;
$function$
;
