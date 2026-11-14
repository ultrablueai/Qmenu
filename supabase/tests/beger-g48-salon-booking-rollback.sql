-- Beger G48 transactional acceptance: all inserted fixtures rolled back.
begin;
create temp table g48_case(
 business_id uuid,foreign_business uuid,branch_id uuid,owner_id uuid,worker_id uuid,
 staff_1 uuid,staff_2 uuid,chair_1 uuid,chair_2 uuid,
 service_1 uuid,service_2 uuid,start_at timestamptz,booking_id uuid
) on commit drop;
grant select on g48_case to authenticated;
do $setup$
declare b uuid;f uuid;br uuid;owner_user uuid;worker_user uuid;
 st1 uuid;st2 uuid;ch1 uuid;ch2 uuid;svc1 uuid;svc2 uuid;
 local_day date;at_time timestamptz;dow integer;
begin
 select user_id into owner_user from public.memberships where role='owner' order by created_at limit 1;
 select user_id into worker_user from public.memberships where role='staff' and user_id<>owner_user order by created_at limit 1;
 if owner_user is null or worker_user is null then raise exception 'Missing staging owner/staff';end if;
 insert into public.businesses(name,country_code) values('G48 rollback salon','TR') returning id into b;
 insert into public.businesses(name,country_code) values('G48 other salon','TR') returning id into f;
 insert into public.branches(business_id,name) values(b,'G48 test branch') returning id into br;
 insert into public.memberships(business_id,user_id,role) values(b,owner_user,'owner'),(b,worker_user,'staff');
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 values(b,br,worker_user,'Worker One') returning id into st1;
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 values(b,br,owner_user,'Worker Two') returning id into st2;
 insert into public.salon_chairs(business_id,branch_id,label)
 values(b,br,'Chair One') returning id into ch1;
 insert into public.salon_chairs(business_id,branch_id,label)
 values(b,br,'Chair Two') returning id into ch2;
 insert into public.salon_services(business_id,name,duration_minutes,buffer_minutes,price_minor)
 values(b,'Hair',30,0,35000) returning id into svc1;
 insert into public.salon_services(business_id,name,duration_minutes,buffer_minutes,price_minor)
 values(b,'Beard',20,0,20000) returning id into svc2;
 insert into public.salon_staff_services(business_id,staff_id,service_id)
 values(b,st1,svc1),(b,st1,svc2),(b,st2,svc1),(b,st2,svc2);
 local_day := (now() at time zone 'Europe/Istanbul')::date+7;
 at_time := (local_day + time '10:00') at time zone 'Europe/Istanbul';
 dow := extract(dow from local_day);
 insert into public.salon_staff_schedules(business_id,staff_id,weekday,opens_at,closes_at,
  gap_minutes,break_start,break_end) values
  (b,st1,dow,'09:00','19:00',10,'13:00','14:00'),
  (b,st2,dow,'09:00','19:00',10,'13:00','14:00');
 insert into g48_case values(b,f,br,owner_user,worker_user,st1,st2,ch1,ch2,svc1,svc2,at_time,null);
end $setup$;
select set_config('request.jwt.claim.sub',(select owner_id::text from g48_case),true);
set local role authenticated;
do $owner$
declare c g48_case%rowtype;result jsonb;setup jsonb;booking uuid;
begin
 select * into c from g48_case;
 setup:=public.beger_g48_salon_booking_setup(c.business_id);
 if pg_catalog.jsonb_array_length(setup->'services')<>2
  or pg_catalog.jsonb_array_length(setup->'staff')<>2
  or pg_catalog.jsonb_array_length(setup->'chairs')<>2
 then raise exception 'Owner pilot setup wrong: %',setup;end if;
 result:=public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Pilot Customer',
  c.staff_1,c.chair_1,array[c.service_1,c.service_2],c.start_at);
 booking:=(result->>'booking_id')::uuid;
 update g48_case set booking_id=booking;
 if result->>'state'<>'pending' or (result->>'service_count')::integer<>2 or
  (result->>'total_minor')::bigint<>55000 or
  (result->>'ends_at')::timestamptz<>c.start_at+interval '70 minutes' then
  raise exception 'Wrong basket booking: %',result;end if;
 begin
  perform public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Overlap Worker',
   c.staff_1,c.chair_2,array[c.service_1],c.start_at+interval '30 minutes');
  raise exception 'SECURITY collision not blocked for same worker';
 exception when sqlstate '23P01' then null;end;
 begin
  perform public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Overlap Chair',
   c.staff_2,c.chair_1,array[c.service_1],c.start_at+interval '20 minutes');
  raise exception 'SECURITY collision not blocked for same chair';
 exception when sqlstate '23P01' then null;end;
 begin
  perform public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Overlap Break',
   c.staff_1,c.chair_1,array[c.service_1,c.service_2],c.start_at+interval '150 minutes');
  raise exception 'SECURITY staff break not blocked';
 exception when sqlstate '22023' then null;end;
 begin
  perform public.beger_g48_create_salon_booking(c.foreign_business,c.branch_id,'Other Tenant',
   c.staff_1,c.chair_1,array[c.service_1],c.start_at);
  raise exception 'SECURITY foreign business booking';
 exception when sqlstate '42501' then null;end;
 result:=public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Next Customer',
  c.staff_1,c.chair_1,array[c.service_1],c.start_at+interval '70 minutes');
 if result->>'state'<>'pending' then raise exception 'Back-to-back booking rejected';end if;
end $owner$;
select set_config('request.jwt.claim.sub',(select worker_id::text from g48_case),true);
do $staff$
declare c g48_case%rowtype;setup jsonb;result jsonb;
begin
 select * into c from g48_case;
 setup:=public.beger_g48_salon_booking_setup(c.business_id);
 if pg_catalog.jsonb_array_length(setup->'staff')<>1 then
  raise exception 'Staff catalog leaked workers';end if;
 begin
  perform public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'Wrong Worker',
   c.staff_2,c.chair_2,array[c.service_1],c.start_at+interval '120 minutes');
  raise exception 'SECURITY staff booking coworker calendar';
 exception when sqlstate '42501' then null;end;
 result:=public.beger_g48_create_salon_booking(c.business_id,c.branch_id,'My Customer',
  c.staff_1,c.chair_2,array[c.service_1],c.start_at+interval '120 minutes');
 if result->>'state'<>'pending' then raise exception 'Own booking rejected';end if;
end $staff$;
reset role;
select (select count(*) from public.salon_bookings b join g48_case c on c.business_id=b.business_id) as bookings_created,
 (select count(*) from public.salon_booking_services s join g48_case c on c.business_id=s.business_id) as service_lines,
 (select count(*) from public.salon_booking_events e join g48_case c on c.business_id=e.business_id and e.event_type='requested') as audit_events,
 (select count(*) from public.salon_bookings b join g48_case c on c.id=b.id where b.total_minor=55000) as multibasket_count;
rollback;
