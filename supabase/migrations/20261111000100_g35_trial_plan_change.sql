-- G35: platform-owner-approved in-trial plan switch. STAGING only.
-- Preserve the original 14-day clock; no refund, billing, renewal or paid activation.
create or replace function public.beger_g35_approve_trial_plan_change(p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=(select auth.uid()); v_business uuid; v_kind text; v_status text;
 v_new_code text; v_period text; v_new_plan uuid; v_sub_id uuid; v_old_plan uuid;
 v_start timestamptz; v_end timestamptz; v_old_code text;
begin
 if v_actor is null or not exists (
  select 1 from public.platform_admins a where a.user_id=v_actor and a.enabled=true and a.role='platform_owner'
 ) then raise exception 'Platform owner required for trial plan switch' using errcode='42501';end if;
 if p_request is null then raise exception 'Request required' using errcode='22023';end if;
 select r.business_id into v_business from public.g13_subscription_requests r where r.id=p_request;
 if v_business is null then raise exception 'Request unavailable' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:subscription_request:'||v_business::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:trial:'||v_business::text,0));
 select r.kind,r.status,r.requested_plan_code,r.requested_period
 into v_kind,v_status,v_new_code,v_period
 from public.g13_subscription_requests r where r.id=p_request and r.business_id=v_business for update;
 if v_kind<>'plan_review' or v_status<>'pending' or v_new_code not in ('start','pro','business')
   or v_period not in ('monthly','yearly') then
  raise exception 'Pending plan-selected review required' using errcode='22023';
 end if;
 if not exists(select 1 from public.businesses b where b.id=v_business and b.country_code='TR') then
  raise exception 'Turkey business required' using errcode='22023';
 end if;
 select p.id into v_new_plan from public.plans p where p.code=v_new_code and p.active=true;
 if v_new_plan is null then raise exception 'Target plan unavailable' using errcode='22023';end if;
 select s.id,s.plan_id,s.starts_at,s.ends_at
 into v_sub_id,v_old_plan,v_start,v_end
 from public.subscriptions s
 where s.business_id=v_business and s.status='trial'
 order by s.starts_at desc,s.created_at desc,s.id desc limit 1 for update;
 if v_sub_id is null or v_start>now() or v_end is null or v_end<=now()
   or v_end>v_start+interval '14 days' then
   raise exception 'Only a current 14-day free trial may switch plans' using errcode='22023';
 end if;
 -- A paid/latest other subscription must never be overwritten by this free-trial path.
 if exists(select 1 from public.subscriptions s where s.business_id=v_business
    and s.id<>v_sub_id and (s.starts_at,s.created_at,s.id)>(v_start,
      (select created_at from public.subscriptions where id=v_sub_id),v_sub_id)) then
  raise exception 'Another subscription supersedes this trial' using errcode='22023';
 end if;
 if v_old_plan=v_new_plan then raise exception 'Trial already uses selected plan' using errcode='22023';end if;
 select p.code into v_old_code from public.plans p where p.id=v_old_plan;
 update public.subscriptions set plan_id=v_new_plan where id=v_sub_id and status='trial';
 if not found then raise exception 'Trial changed during review' using errcode='40001';end if;
 update public.g13_subscription_requests
 set status='acknowledged',reviewed_by=v_actor,reviewed_at=now(),updated_at=now()
 where id=p_request and status='pending';
 if not found then raise exception 'Request changed during review' using errcode='40001';end if;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'merchant_trial_plan_changed','subscription',v_sub_id,
  pg_catalog.jsonb_build_object('business_id',v_business,'request_id',p_request,
  'old_plan',v_old_code,'new_plan',v_new_code,'requested_future_period',v_period,
  'trial_end_unchanged',true,'paid_subscription_modified',false));
 return pg_catalog.jsonb_build_object(
  'status','trial','plan',v_new_code,'previous_plan',v_old_code,
  'trial_ends_at',v_end,'billing_enabled',false,'trial_extended',false,
  'paid_subscription_modified',false,'request_id',p_request);
end;
$$;
revoke all on function public.beger_g35_approve_trial_plan_change(uuid) from public,anon,authenticated;
grant execute on function public.beger_g35_approve_trial_plan_change(uuid) to authenticated;
