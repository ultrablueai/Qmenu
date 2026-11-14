-- G32: platform owner can authorize the merchant-requested 14-day FREE trial on isolated Staging.
-- No payment, published pricing, automatic renewal, invoice, or paid entitlement mutation.
create or replace function public.beger_g32_approve_trial_request(p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=(select auth.uid());v_business uuid;v_plan_code text;v_kind text;
 v_status text;v_plan_id uuid;v_trial_id uuid;
begin
 if v_actor is null or not exists (
  select 1 from public.platform_admins a where a.user_id=v_actor and a.enabled=true
    and a.role='platform_owner'
 ) then raise exception 'Platform owner approval required' using errcode='42501';end if;
 if p_request is null then raise exception 'Request required' using errcode='22023';end if;
 select r.business_id into v_business from public.g13_subscription_requests r where r.id=p_request;
 if v_business is null then raise exception 'Request not found' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:subscription_request:'||v_business::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:trial:'||v_business::text,0));
 select r.kind,r.status,r.requested_plan_code
 into v_kind,v_status,v_plan_code
 from public.g13_subscription_requests r
 where r.id=p_request and r.business_id=v_business for update;
 if v_kind<>'trial' or v_status<>'pending' or v_plan_code not in ('start','pro','business') then
  raise exception 'Only pending plan-selected trials may be approved' using errcode='22023';
 end if;
 if not exists(select 1 from public.businesses b where b.id=v_business and b.country_code='TR') then
  raise exception 'Turkey trial only' using errcode='22023';
 end if;
 select p.id into v_plan_id from public.plans p where p.code=v_plan_code and p.active=true;
 if v_plan_id is null then raise exception 'Active plan unavailable' using errcode='22023';end if;
 if exists(select 1 from public.subscriptions s where s.business_id=v_business) then
  raise exception 'Merchant already has subscription history' using errcode='23505';
 end if;
 insert into public.subscriptions(business_id,plan_id,status,starts_at,ends_at)
 values(v_business,v_plan_id,'trial',now(),now()+interval '14 days')
 returning id into v_trial_id;
 update public.g13_subscription_requests
 set status='acknowledged',reviewed_by=v_actor,reviewed_at=now(),updated_at=now()
 where id=p_request and status='pending';
 if not found then raise exception 'Request changed during approval' using errcode='40001';end if;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'merchant_trial_14d_approved','subscription',v_trial_id,
  pg_catalog.jsonb_build_object('business_id',v_business,'plan',v_plan_code,'request_id',p_request,'trial_days',14));
 return pg_catalog.jsonb_build_object('trial_id',v_trial_id,'request_id',p_request,
  'plan',v_plan_code,'state','trial','trial_days',14,'billing_enabled',false,
  'paid_entitlements_enabled',false,'automatically_renews',false);
end;
$$;
revoke all on function public.beger_g32_approve_trial_request(uuid) from public,anon,authenticated;
grant execute on function public.beger_g32_approve_trial_request(uuid) to authenticated;
