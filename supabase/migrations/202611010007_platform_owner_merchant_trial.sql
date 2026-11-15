-- Beger owner-controlled one-time merchant trial assignment. STAGING ONLY.
-- No price, paid status, payment collection or automatic charge is represented.
-- Lock by business to avoid concurrent duplicate trial creation.
create function public.platform_owner_start_trial(p_business uuid,p_plan uuid,p_days integer)
returns uuid language plpgsql security definer set search_path=''
as $$
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
$$;
revoke all on function public.platform_owner_start_trial(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.platform_owner_start_trial(uuid,uuid,integer) to authenticated;

-- This is an informational overview: effective expiry derives from ends_at rather
-- than relying on a background status update that does not exist yet.
create function public.platform_admin_trial_overview()
returns table(business_id uuid,plan_code text,starts_at timestamptz,ends_at timestamptz,effective_status text)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins pa where pa.user_id=v_actor and pa.enabled=true
 ) then raise exception 'platform admin required' using errcode='42501'; end if;
 return query select s.business_id,p.code,s.starts_at,s.ends_at,
   case when s.status='trial' and s.ends_at is not null and s.ends_at<=now()
     then 'expired' else s.status end
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 order by s.created_at desc,s.id desc limit 100;
end;
$$;
revoke all on function public.platform_admin_trial_overview() from public,anon,authenticated;
grant execute on function public.platform_admin_trial_overview() to authenticated;

-- Fix the directory to avoid calling an expired trial "trial".
create or replace function public.platform_admin_business_directory()
returns table(
 business_id uuid,business_name text,country_code text,branch_count bigint,member_count bigint,
 subscription_status text,created_at timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists (
  select 1 from public.platform_admins pa
  where pa.user_id=v_actor and pa.enabled=true
 ) then raise exception 'platform admin required' using errcode='42501'; end if;
 return query
 select b.id,b.name,b.country_code,
   (select count(*) from public.branches br where br.business_id=b.id),
   (select count(*) from public.memberships m where m.business_id=b.id),
   (select case when s.status='trial' and s.ends_at is not null and s.ends_at<=now()
      then 'expired' else s.status end
    from public.subscriptions s where s.business_id=b.id
    order by s.created_at desc,s.id desc limit 1),
   b.created_at
 from public.businesses b
 order by b.created_at desc,b.id
 limit 100;
end;
$$;
