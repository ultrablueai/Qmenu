-- Beger G35 — merchant-selected trial upgrade acceptance. STAGING ONLY.
-- Simulated role claims, temporary business and all writes rolled back.
begin;
create temp table g35_fixture(business_id uuid,merchant_id uuid,admin_id uuid,request_id uuid,original_end timestamptz) on commit drop;
grant select,update on g35_fixture to authenticated;
do $setup$
declare b uuid;u uuid;a uuid;e timestamptz;
begin
 select m.user_id into u from public.memberships m where m.role='owner'
 and not exists(select 1 from public.platform_admins z where z.user_id=m.user_id and z.enabled)
 order by m.created_at limit 1;
 select user_id into a from public.platform_admins where enabled and role='platform_owner' order by user_id limit 1;
 if u is null or a is null then raise exception 'Missing test actors';end if;
 insert into public.businesses(name,country_code) values('G35 rollback-only upgrade','TR') returning id into b;
 insert into public.memberships(business_id,user_id,role) values(b,u,'owner');
 e:=now()+interval '13 days';
 insert into public.subscriptions(business_id,plan_id,status,starts_at,ends_at)
 select b,id,'trial',now()-interval '1 day',e from public.plans where code='start' limit 1;
 insert into g35_fixture values(b,u,a,null,e);
end $setup$;
select set_config('request.jwt.claim.sub',(select merchant_id::text from g35_fixture),true);
set local role authenticated;
do $merchant$
declare r jsonb;
begin
 r:=public.beger_g31_request_plan((select business_id from g35_fixture),'pro','yearly',false);
 if r->>'status'<>'pending' or r->>'subscription_activated'<>'false' then raise exception 'Request wrongly activated';end if;
 update g35_fixture set request_id=(r->>'id')::uuid;
 begin
  perform public.beger_g35_approve_trial_plan_change((select request_id from g35_fixture));
  raise exception 'SECURITY_FAILURE: merchant approved own switch';
 exception when sqlstate '42501' then null;
 end;
end $merchant$;
select set_config('request.jwt.claim.sub',(select admin_id::text from g35_fixture),true);
do $admin$
declare r jsonb;
begin
 r:=public.beger_g35_approve_trial_plan_change((select request_id from g35_fixture));
 if r->>'status'<>'trial' or r->>'plan'<>'pro' or r->>'previous_plan'<>'start'
 or r->>'trial_extended'<>'false' or r->>'billing_enabled'<>'false' then
  raise exception 'Upgrade wrong result: %',r;
 end if;
 begin
  perform public.beger_g35_approve_trial_plan_change((select request_id from g35_fixture));
  raise exception 'SECURITY_FAILURE: double approval allowed';
 exception when sqlstate '22023' then null;
 end;
end $admin$;
reset role;
select
 (select count(*) from public.subscriptions s join g35_fixture f on s.business_id=f.business_id
  join public.plans p on p.id=s.plan_id where s.status='trial' and p.code='pro'
  and s.ends_at=f.original_end) as preserved_trial,
 (select count(*) from public.g13_subscription_requests r join g35_fixture f on r.id=f.request_id where r.status='acknowledged') as reviewed,
 (select count(*) from public.platform_audit_events e join g35_fixture f
  on e.details->>'business_id'=f.business_id::text where e.action='merchant_trial_plan_changed') as audit_rows;
rollback;
