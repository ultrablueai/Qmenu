-- Beger G34: cancel a free trial on a merchant's pending cancellation request.
-- Explicit platform-owner action; does not apply to paid subscriptions.
-- No automatic schedule, payments, invoices, or deletion of merchant data.
create or replace function public.beger_g34_approve_trial_cancellation(p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=(select auth.uid());
 v_business uuid;
 v_kind text;
 v_request_status text;
 v_subscription uuid;
 v_sub_status text;
 v_cancel_time timestamptz:=now();
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins a
   where a.user_id=v_actor and a.enabled=true and a.role='platform_owner'
 ) then raise exception 'Platform owner required for trial cancellation' using errcode='42501';end if;
 if p_request is null then raise exception 'Request required' using errcode='22023';end if;
 select r.business_id into v_business from public.g13_subscription_requests r where r.id=p_request;
 if v_business is null then raise exception 'Request unavailable' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:subscription_request:'||v_business::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:trial:'||v_business::text,0));
 select r.kind,r.status into v_kind,v_request_status
 from public.g13_subscription_requests r where r.id=p_request and r.business_id=v_business for update;
 if v_kind<>'cancellation' or v_request_status<>'pending' then
  raise exception 'Pending cancellation request required' using errcode='22023';
 end if;
 select s.id,s.status into v_subscription,v_sub_status
 from public.subscriptions s where s.business_id=v_business
 order by s.starts_at desc,s.created_at desc,s.id desc limit 1 for update;
 if v_subscription is null or v_sub_status<>'trial' then
  raise exception 'Only free trials may be cancelled here' using errcode='22023';
 end if;
 update public.subscriptions set status='cancelled',
   ends_at=least(coalesce(ends_at,v_cancel_time),v_cancel_time)
 where id=v_subscription and status='trial';
 if not found then raise exception 'Subscription changed during cancellation' using errcode='40001';end if;
 update public.g13_subscription_requests
 set status='acknowledged',reviewed_by=v_actor,reviewed_at=v_cancel_time,updated_at=v_cancel_time
 where id=p_request and status='pending';
 if not found then raise exception 'Request changed during cancellation' using errcode='40001';end if;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'merchant_trial_cancelled','subscription',v_subscription,
 pg_catalog.jsonb_build_object('business_id',v_business,'request_id',p_request,
  'data_retained',true,'paid_subscription_modified',false));
 return pg_catalog.jsonb_build_object('status','cancelled','trial_id',v_subscription,
  'request_id',p_request,'data_retained',true,'billing_enabled',false);
end;
$$;
revoke all on function public.beger_g34_approve_trial_cancellation(uuid) from public,anon,authenticated;
grant execute on function public.beger_g34_approve_trial_cancellation(uuid) to authenticated;
