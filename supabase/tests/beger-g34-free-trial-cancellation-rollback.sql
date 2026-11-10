-- G34 Staging-only rollback acceptance for free trial cancellation.
-- Authorized identity simulation (NOT real signed JWT browser E2E).
-- All fixtures, subscriptions and audit writes are rolled back.
begin;
create temp table g34_case(business_id uuid,merchant_id uuid,admin_id uuid,request_id uuid) on commit drop;
grant select,update on g34_case to authenticated;
do $setup$
declare b uuid;u uuid;a uuid;
begin
 select m.user_id into u from public.memberships m where m.role='owner'
 and not exists(select 1 from public.platform_admins z where z.user_id=m.user_id and z.enabled)
 order by m.created_at limit 1;
 select user_id into a from public.platform_admins where enabled and role='platform_owner' order by user_id limit 1;
 if u is null or a is null then raise exception 'Missing staged test actors';end if;
 insert into public.businesses(name,country_code) values('G34 rollback-only free-trial cancellation','TR') returning id into b;
 insert into public.memberships(business_id,user_id,role) values(b,u,'owner');
 insert into public.subscriptions(business_id,plan_id,status,starts_at,ends_at)
 select b,id,'trial',now()-interval '1 day',now()+interval '13 days' from public.plans where code='pro' limit 1;
 insert into g34_case values(b,u,a,null);
end $setup$;
select set_config('request.jwt.claim.sub',(select merchant_id::text from g34_case),true);
set local role authenticated;
do $merchant$
declare r jsonb;
begin
 r:=public.g13_subscription_request((select business_id from g34_case),'cancellation');
 if r->>'status'<>'pending' then raise exception 'Cancellation request did not queue'; end if;
 update g34_case set request_id=(r->>'id')::uuid;
 begin
  perform public.beger_g34_approve_trial_cancellation((select request_id from g34_case));
  raise exception 'Security failed: merchant approved own cancellation';
 exception when sqlstate '42501' then null;
 end;
end $merchant$;
select set_config('request.jwt.claim.sub',(select admin_id::text from g34_case),true);
do $admin$
declare r jsonb;
begin
 r:=public.beger_g34_approve_trial_cancellation((select request_id from g34_case));
 if r->>'status'<>'cancelled' or r->>'data_retained'<>'true' or r->>'billing_enabled'<>'false'
 then raise exception 'Wrong cancellation result'; end if;
 begin
  perform public.beger_g34_approve_trial_cancellation((select request_id from g34_case));
  raise exception 'Security failed: duplicate cancellation';
 exception when sqlstate '22023' then null;
 end;
end $admin$;
select set_config('request.jwt.claim.sub',(select merchant_id::text from g34_case),true);
do $status_check$
declare state jsonb;
begin
 state:=public.g12_merchant_subscription_status((select business_id from g34_case));
 if state->>'state'<>'cancelled' then raise exception 'Merchant status not cancelled';end if;
 state:=public.beger_g33_merchant_entitlements_preview((select business_id from g34_case));
 if state->>'state'<>'cancelled' or state->'features'->>'table_orders'<>'false'
 or state->>'enforcement_enabled'<>'false' then raise exception 'Entitlement preview did not reflect cancellation';end if;
end $status_check$;
reset role;
select
 (select count(*) from public.subscriptions s join g34_case c on c.business_id=s.business_id where s.status='cancelled' and s.ends_at<=now()) as cancelled_trials,
 (select count(*) from public.g13_subscription_requests r join g34_case c on c.request_id=r.id where r.status='acknowledged') as approved_requests,
 (select count(*) from public.platform_audit_events e join g34_case c on e.details->>'business_id'=c.business_id::text where e.action='merchant_trial_cancelled') as audit_records;
rollback;
