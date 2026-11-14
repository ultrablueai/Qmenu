-- G36 Staging-only rollback acceptance: grace calculation and cross-tenant rejection.
begin;
create temp table g36_probe (merchant uuid,business uuid,foreign_business uuid) on commit drop;
grant select on g36_probe to authenticated;
do $fixture$
declare u uuid; b uuid; other uuid;
begin
 select m.user_id into u from public.memberships m
  where m.role='owner'
  and not exists(select 1 from public.platform_admins a where a.user_id=m.user_id and a.enabled)
  order by m.created_at limit 1;
 if u is null then raise exception 'Missing ordinary owner';end if;
 insert into public.businesses(name,country_code)
 values('G36 rollback-only grace fixture','TR') returning id into b;
 insert into public.memberships(user_id,business_id,role) values(u,b,'owner');
 insert into public.subscriptions(business_id,plan_id,status,starts_at,ends_at)
 select b,id,'past_due',now()-interval '35 days',now()-interval '2 days'
 from public.plans where code='pro' limit 1;
 select id into other from public.businesses x
 where id<>b and not exists(select 1 from public.memberships m
  where m.user_id=u and m.business_id=x.id) limit 1;
 if other is null then raise exception 'Missing foreign business';end if;
 insert into g36_probe values(u,b,other);
end $fixture$;
select set_config('request.jwt.claim.sub',(select merchant::text from g36_probe),true);
set local role authenticated;
do $test$
declare r jsonb;
begin
 r:=public.beger_g36_renewal_preflight((select business from g36_probe));
 if r->>'state'<>'grace' or r->>'billing_enabled'<>'false'
   or r->>'settlement_verified'<>'false' or r->>'price_published'<>'false'
   or r->>'action'<>'request_renewal_review'
   or r->>'auto_renewal_enabled'<>'false' or r->>'entitlements_changed'<>'false'
   or r->>'data_retained'<>'true' then
     raise exception 'G36 grace policy failed: %',r;
 end if;
 begin
  perform public.beger_g36_renewal_preflight((select foreign_business from g36_probe));
  raise exception 'SECURITY FAILURE: foreign tenant leaked';
 exception when sqlstate '42501' then null;end;
end $test$;
reset role;
select 'PASS: grace read-only, no payment, foreign tenant denied' result;
rollback;
