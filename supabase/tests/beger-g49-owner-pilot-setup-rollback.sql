-- G49 server integration: temporary fixtures only, rollback at end.
begin;
create temp table g49_case(business_id uuid,owner_id uuid,worker_id uuid) on commit drop;
grant select on g49_case to authenticated;
do $setup$
declare b uuid;ow uuid;wk uuid;
begin
 select user_id into ow from public.memberships where role='owner' order by created_at limit 1;
 select user_id into wk from public.memberships where role='staff' and user_id<>ow order by created_at limit 1;
 if ow is null or wk is null then raise exception 'Missing owner and worker staging identities';end if;
 insert into public.businesses(name,country_code) values('G49 rollback salon','TR') returning id into b;
 insert into public.memberships(business_id,user_id,role) values(b,ow,'owner'),(b,wk,'staff');
 insert into g49_case values(b,ow,wk);
end $setup$;
select set_config('request.jwt.claim.sub',(select worker_id::text from g49_case),true);
set local role authenticated;
do $denied$
begin
 begin
  perform public.beger_g49_setup_salon_pilot((select business_id from g49_case),
   'Pilot salon','00000000-0000-0000-0000-000000000000'::uuid,
   'Pilot barber','Chair 1','Hair cut',30,35000);
  raise exception 'SECURITY staff setup unexpectedly allowed';
 exception when sqlstate '42501' then null; end;
end $denied$;
select set_config('request.jwt.claim.sub',(select owner_id::text from g49_case),true);
do $owner$
declare r jsonb; b uuid; w uuid;other uuid;
begin
 select business_id,worker_id into b,w from g49_case;
 begin
  perform public.beger_g49_setup_salon_pilot(b,'Pilot branch',gen_random_uuid(),
   'Pilot barber','Chair 1','Hair cut',30,35000);
  raise exception 'SECURITY non-member worker accepted';
 exception when sqlstate '42501' then null; end;
 r:=public.beger_g49_setup_salon_pilot(b,'Pilot branch',w,
   'Pilot barber','Chair 1','Hair cut',30,35000);
 if r->>'status'<>'pilot_ready' or r->>'public_booking_enabled'<>'false' or
  r->>'notifications_enabled'<>'false' or r->>'gap_minutes'<>'10' then
  raise exception 'Pilot setup result incorrect: %',r;end if;
 if (select count(*) from public.salon_staff s where s.business_id=b and s.user_id=w)<>1
  or (select count(*) from public.salon_chairs c where c.business_id=b)<>1
  or (select count(*) from public.salon_services s where s.business_id=b)<>1
  or (select count(*) from public.salon_staff_schedules s where s.business_id=b)<>7 then
  raise exception 'Pilot resources incomplete';end if;
 if (select count(*) from public.salon_staff_services x where x.business_id=b)<>1 then
  raise exception 'Service not assigned to worker';end if;
end $owner$;
select set_config('request.jwt.claim.sub',(select worker_id::text from g49_case),true);
do $staff$
declare j jsonb;
begin
 j:=public.beger_g48_salon_booking_setup((select business_id from g49_case));
 if pg_catalog.jsonb_array_length(j->'staff')<>1 or
    pg_catalog.jsonb_array_length(j->'chairs')<>1 or
    pg_catalog.jsonb_array_length(j->'services')<>1 then
  raise exception 'G48 setup cannot see G49 resources: %',j;end if;
end $staff$;
reset role;
select
 (select count(*) from public.salon_staff s join g49_case c on s.business_id=c.business_id) staff_count,
 (select count(*) from public.salon_chairs s join g49_case c on s.business_id=c.business_id) chair_count,
 (select count(*) from public.salon_staff_schedules s join g49_case c on s.business_id=c.business_id) shift_count;
rollback;
