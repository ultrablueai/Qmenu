-- G31/G32 staging end-to-end dry run: owner chooses Pro then platform owner activates 14-day trial.
-- Uses disposable tenant and simulated role/JWT claims; always ROLLBACK. Not browser JWT E2E.
begin;
create temp table g32_fixture(business_id uuid,merchant_id uuid,platform_owner_id uuid,request_id uuid) on commit drop;
grant select,update on g32_fixture to authenticated;
do $setup$
declare b uuid; u uuid; a uuid;
begin
 select m.user_id into u from public.memberships m where m.role='owner'
 and not exists(select 1 from public.platform_admins z where z.user_id=m.user_id and z.enabled)
 order by m.created_at limit 1;
 select user_id into a from public.platform_admins where enabled and role='platform_owner' order by user_id limit 1;
 if u is null or a is null then raise exception 'Missing staged merchant/admin actors';end if;
 insert into public.businesses(name,country_code) values('G32 temporary trial fixture','TR') returning id into b;
 insert into public.memberships(business_id,user_id,role) values(b,u,'owner');
 insert into g32_fixture values(b,u,a,null);
end $setup$;
select set_config('request.jwt.claim.sub',(select merchant_id::text from g32_fixture),true);
set local role authenticated;
do $merchant$
declare r jsonb;
begin
 r:=public.beger_g31_request_plan((select business_id from g32_fixture),'pro','monthly',true);
 if r->>'status'<>'pending' or r->>'subscription_activated'<>'false' or r->>'billing_enabled'<>'false'
 then raise exception 'Merchant request wrong';end if;
 update g32_fixture set request_id=(r->>'id')::uuid;
end $merchant$;
select set_config('request.jwt.claim.sub',(select platform_owner_id::text from g32_fixture),true);
do $operator$
declare r jsonb;
begin
 r:=public.beger_g32_approve_trial_request((select request_id from g32_fixture));
 if r->>'state'<>'trial' or (r->>'trial_days')::int<>14 or r->>'billing_enabled'<>'false'
 then raise exception 'Trial approval wrong';end if;
 begin
  perform public.beger_g32_approve_trial_request((select request_id from g32_fixture));
  raise exception 'Duplicate trial incorrectly allowed';
 exception when sqlstate '22023' then null;
 end;
end $operator$;
reset role;
select
 (select count(*) from public.subscriptions s join g32_fixture f
  on s.business_id=f.business_id and s.status='trial' and s.ends_at-s.starts_at=interval '14 days') as trial_records,
 (select count(*) from public.g13_subscription_requests r join g32_fixture f
  on r.id=f.request_id and r.status='acknowledged') as acknowledged_requests,
 (select count(*) from public.platform_audit_events e join g32_fixture f
  on e.target_id=(select s.id from public.subscriptions s where s.business_id=f.business_id limit 1)
  and e.action='merchant_trial_14d_approved') as approval_audit_records;
rollback;
