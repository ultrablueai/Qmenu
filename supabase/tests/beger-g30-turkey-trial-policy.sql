-- Beger G30 Turkish trial enforcement; Staging only, no trial writes.
begin read only;
select set_config('request.jwt.claim.sub',(
 select user_id::text from public.platform_admins
 where enabled=true and role='platform_owner' order by user_id limit 1
),true);
set local role authenticated;
do $test$
declare b uuid; p uuid:='00000000-0000-0000-0000-000000000000';
begin
 select id into b from public.businesses where country_code='TR' order by id limit 1;
 if b is null then raise exception 'Missing TR fixture';end if;
 begin
  perform public.platform_owner_start_trial(b,p,7);
  raise exception 'G30 FAIL: 7-day TR trial allowed';
 exception when sqlstate '22023' then
  if sqlerrm not like '%exactly 14 days%' then raise exception 'Wrong denial: %',sqlerrm;end if;
 end;
 begin
  perform public.platform_owner_start_trial(b,p,30);
  raise exception 'G30 FAIL: 30-day TR trial allowed';
 exception when sqlstate '22023' then
  if sqlerrm not like '%exactly 14 days%' then raise exception 'Wrong denial: %',sqlerrm;end if;
 end;
 begin
  perform public.platform_owner_start_trial(b,p,14);
  raise exception 'G30 FAIL: 14-day trial bypassed plan validation';
 exception when sqlstate '22023' then
  if sqlerrm not like '%active plan required%' then raise exception 'Wrong 14-day behavior: %',sqlerrm;end if;
 end;
end $test$;
select 'G30 PASS: TR 7/30 rejected, 14 proceeds to plan validation' result;
rollback;
