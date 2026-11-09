-- Beger G28: staging-only 30-slot rehearsal acceptance.
-- Inserts disposable businesses inside a single transaction; ROLLBACK means no persistent fixtures.
-- Execute with authorized Staging SQL admin only. DO NOT run against Production.
begin;
create temp table g28_fixture(business_id uuid, seq int) on commit drop;
grant select on g28_fixture to authenticated;
with fixtures as (
 insert into public.businesses(name,country_code)
 select 'G28 Rollback-Only Fixture '||g::text,'TR' from generate_series(1,31) g
 returning id,name
)
insert into g28_fixture(business_id,seq)
select id,split_part(name,' ',4)::int from fixtures;
select set_config('request.jwt.claim.sub',(
 select user_id::text from public.platform_admins
 where enabled and role='platform_owner' order by user_id limit 1
),true);
set local role authenticated;
do $cap$
declare v_id uuid; v jsonb; i int;
begin
 for i in 1..30 loop
  select business_id into v_id from g28_fixture where seq=i;
  v:=public.beger_g28_founder_dry_run_claim(v_id);
  if (v->>'slot')::int<>i or v->>'duplicate'<>'false' then
   raise exception 'Slot % not allocated safely',i;
  end if;
 end loop;
 select business_id into v_id from g28_fixture where seq=1;
 v:=public.beger_g28_founder_dry_run_claim(v_id);
 if (v->>'slot')::int<>1 or v->>'duplicate'<>'true' then
  raise exception 'Same-business duplicate claim consumed a new slot';
 end if;
 select business_id into v_id from g28_fixture where seq=31;
 begin
  perform public.beger_g28_founder_dry_run_claim(v_id);
  raise exception 'SECURITY_TEST_FAILURE: 31st slot allocated';
 exception when sqlstate 'P0001' then null;
 end;
end $cap$;
select 'G28 PASS - 30 distinct slots, repeat idempotent, 31st denied; all rolled back' as result;
rollback;
