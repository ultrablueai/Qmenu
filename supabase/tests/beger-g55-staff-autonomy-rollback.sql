-- G51 staging rollback smoke for genuinely anonymous bookings. No durable customer records.
begin;
create temp table g51_case(business_id uuid,owner_id uuid,worker_id uuid,branch_id uuid,
 staff_id uuid,chair_id uuid,service_id uuid,slug text,start_at timestamptz,booking_id uuid,token text) on commit drop;
grant select,update on g51_case to authenticated,anon;
do $setup$
declare b uuid;ow uuid;wk uuid;br uuid;st uuid;ch uuid;sv uuid;dt date;
begin
 select user_id into ow from public.memberships where role='owner' order by created_at limit 1;
 select user_id into wk from public.memberships where role='staff' and user_id<>ow order by created_at limit 1;
 if ow is null or wk is null then raise exception 'Missing staging test actors';end if;
 insert into public.businesses(name,country_code) values('G51 rollback public booking','TR') returning id into b;
 insert into public.memberships(business_id,user_id,role) values(b,ow,'owner'),(b,wk,'staff');
 insert into public.branches(business_id,name) values(b,'Salon pilot branch') returning id into br;
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 values(b,br,wk,'Qualified worker') returning id into st;
 insert into public.salon_chairs(business_id,branch_id,label) values(b,br,'Chair 1') returning id into ch;
 insert into public.salon_services(business_id,name,duration_minutes,price_minor)
 values(b,'Basic haircut',30,35000) returning id into sv;
 insert into public.salon_staff_services(business_id,staff_id,service_id)
 values(b,st,sv);
 dt:=(now() at time zone 'Europe/Istanbul')::date+7;
 for i in 0..6 loop
  insert into public.salon_staff_schedules(business_id,staff_id,weekday,opens_at,closes_at,
   break_start,break_end,gap_minutes)
  values(b,st,i,'09:00','19:00','13:00','14:00',10);
 end loop;
 insert into g51_case values(b,ow,wk,br,st,ch,sv,null,
  (dt+time '10:00') at time zone 'Europe/Istanbul',null,null);
end $setup$;
select set_config('request.jwt.claim.sub',(select owner_id::text from g51_case),true);
set local role authenticated;
do $owner$
declare r jsonb;
begin
 r:=public.beger_g51_owner_salon_link((select business_id from g51_case),false,false);
 if r->>'published'<>'false' then raise exception 'Unpublished default failed';end if;
 update g51_case set slug=r->>'slug';
end $owner$;
reset role;
set local role anon;
do $anon_denied$
begin
 begin
  perform public.beger_g51_public_salon_catalog((select slug from g51_case));
  raise exception 'SECURITY: unpublished catalog accessible';
 exception when sqlstate '22023' then null;end;
 begin
  perform public.beger_g51_public_book((select slug from g51_case),'Pilot customer',
   (select branch_id from g51_case),(select staff_id from g51_case),
   (select chair_id from g51_case),array[(select service_id from g51_case)],
   (select start_at from g51_case));
  raise exception 'SECURITY: unpublished public booking accessible';
 exception when sqlstate '42501' then null;end;
end $anon_denied$;
reset role;
select set_config('request.jwt.claim.sub',(select worker_id::text from g51_case),true);
set local role authenticated;
do $worker$
begin
 begin
  perform public.beger_g51_owner_salon_link((select business_id from g51_case),true,true);
  raise exception 'SECURITY: worker changed public booking status';
 exception when sqlstate '42501' then null;end;
end $worker$;
reset role;
select set_config('request.jwt.claim.sub',(select owner_id::text from g51_case),true);
set local role authenticated;
select public.beger_g51_owner_salon_link((select business_id from g51_case),true,true);
reset role;
set local role anon;
do $anon$
declare c g51_case%rowtype;r jsonb;catalog jsonb;tracked jsonb;
begin
 select * into c from g51_case;
 catalog:=public.beger_g51_public_salon_catalog(c.slug);
 if catalog->>'public_booking_enabled'<>'true'
    or pg_catalog.jsonb_array_length(catalog->'services')<>1
    or pg_catalog.jsonb_array_length(catalog->'staff')<>1
    or catalog::text like '%Pilot customer%' then
  raise exception 'Bad public catalog: %',catalog;end if;
 r:=public.beger_g51_public_book(c.slug,'Pilot customer',c.branch_id,c.staff_id,
  c.chair_id,array[c.service_id],c.start_at);
 if r->>'status'<>'pending' or length(r->>'access_token')<>64
    or (r->>'total_minor')::bigint<>35000 then
  raise exception 'Public booking response incorrect: %',r;end if;
 update g51_case set booking_id=(r->>'booking_id')::uuid,token=r->>'access_token';
 tracked:=public.beger_g51_public_track(r->>'access_token');
 if tracked->>'status'<>'pending' or tracked->>'total_minor'<>'35000'
    or tracked ? 'customer_name' then raise exception 'Private tracking leaked or failed';end if;
 begin
  perform public.beger_g51_public_track(repeat('a',64));
  raise exception 'SECURITY invalid tracking bearer accepted';
 exception when sqlstate '42501' then null;end;
 begin
  perform public.beger_g51_public_book(c.slug,'Other customer',c.branch_id,c.staff_id,
   c.chair_id,array[c.service_id],c.start_at+interval '10 minutes');
  raise exception 'SECURITY overlapping public appointment';
 exception when sqlstate '23P01' then null;end;
end $anon$;
reset role;
select set_config('request.jwt.claim.sub',(select worker_id::text from g51_case),true);
set local role authenticated;
do $stage$
declare c g51_case%rowtype;r jsonb;
begin
 select * into c from g51_case;
 begin
  perform public.beger_g52_owner_link_status(c.business_id);
  raise exception 'SECURITY worker read private owner URL configuration';
 exception when sqlstate '42501' then null;end;
 r:=public.beger_g47_approve_salon_booking(c.business_id,c.booking_id);
 if r->>'status'<>'confirmed' then raise exception 'Worker approval failed';end if;
 r:=public.beger_g52_salon_booking_stage(c.business_id,c.booking_id,'arrived');
 if r->>'status'<>'arrived' then raise exception 'Arrival confirmation failed';end if;
 begin
  perform public.beger_g52_salon_booking_stage(c.business_id,c.booking_id,'completed');
  raise exception 'SECURITY skipped service stage';
 exception when sqlstate '22023' then null;end;
 r:=public.beger_g52_salon_booking_stage(c.business_id,c.booking_id,'in_service');
 if r->>'status'<>'in_service' then raise exception 'Start failed';end if;
 r:=public.beger_g52_salon_booking_stage(c.business_id,c.booking_id,'completed');
 if r->>'status'<>'completed' then raise exception 'Finish failed';end if;
 begin
  perform public.beger_g52_salon_booking_stage(c.business_id,c.booking_id,'completed');
  raise exception 'SECURITY duplicate completion';
 exception when sqlstate '22023' then null;end;
end $stage$;
reset role;
set local role anon;
do $track$
declare r jsonb;
begin
 r:=public.beger_g51_public_track((select token from g51_case));
 if r->>'status'<>'completed' then raise exception 'Customer did not observe completion';end if;
 begin
  perform public.beger_g52_salon_booking_stage((select business_id from g51_case),
   (select booking_id from g51_case),'arrived');
  raise exception 'SECURITY anonymous attendance approval';
 exception when sqlstate '42501' then null;end;
end $track$;
reset role;
create temp table g55_other(staff_id uuid) on commit drop;
grant select on g55_other to authenticated;
with added as (
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 select business_id,branch_id,owner_id,'Different worker' from g51_case returning id)
insert into g55_other select id from added;
select set_config('request.jwt.claim.sub',(select worker_id::text from g51_case),true);
set local role authenticated;
do $self$
declare c g51_case%rowtype;r jsonb;
begin
 select * into c from g51_case;
 r:=public.beger_g55_worker_controls(c.business_id);
 if r->>'scope'<>'own_only' or pg_catalog.jsonb_array_length(r->'workers')<>1 then
  raise exception 'Private staff control leaked coworkers: %',r;end if;
 begin
  perform public.beger_g55_set_worker_booking_pause(c.business_id,(select staff_id from g55_other),false);
  raise exception 'SECURITY worker paused another staff';
 exception when sqlstate '42501' then null;end;
 r:=public.beger_g55_set_worker_booking_pause(c.business_id,c.staff_id,false);
 if r->>'accepts_bookings'<>'false' then raise exception 'Booking pause failed';end if;
 r:=public.beger_g55_set_worker_booking_pause(c.business_id,c.staff_id,true);
 if r->>'accepts_bookings'<>'true' then raise exception 'Booking resume failed';end if;
 begin
  perform public.beger_g55_set_worker_service(c.business_id,c.staff_id,c.service_id,false);
  raise exception 'SECURITY turned off booked service';
 exception when sqlstate '23P01' then null;end;
 begin
  perform public.beger_g55_set_worker_shift(c.business_id,c.staff_id,
   extract(dow from c.start_at at time zone 'Europe/Istanbul')::smallint,
   '11:00','19:00',10,'13:00','14:00');
  raise exception 'SECURITY shift invalidated an existing booking';
 exception when sqlstate '23P01' then null;end;
 r:=public.beger_g55_set_worker_shift(c.business_id,c.staff_id,
  extract(dow from c.start_at at time zone 'Europe/Istanbul')::smallint,
  '09:00','19:00',15,'13:00','14:00');
 if r->>'saved'<>'true' then raise exception 'Allowed shift update failed';end if;
end $self$;
reset role;
select set_config('request.jwt.claim.sub',(select owner_id::text from g51_case),true);
set local role authenticated;
do $owner_controls$
declare r jsonb;
begin
 r:=public.beger_g55_worker_controls((select business_id from g51_case));
 if r->>'scope'<>'whole_business' or pg_catalog.jsonb_array_length(r->'workers')<>2 then
  raise exception 'Owner did not see entire staff roster: %',r;end if;
end $owner_controls$;
reset role;
do $assert$
declare c g51_case%rowtype;
begin
 select * into c from g51_case;
 if (select count(*) from public.salon_booking_services where business_id=c.business_id)<>1
 or (select count(*) from public.salon_booking_events where business_id=c.business_id and event_type='requested')<>1
 or (select count(*) from public.salon_customer_access where booking_id=c.booking_id)<>1 then
 raise exception 'Public booking audit/token missing';end if;
end $assert$;
select 'G55 staff self-control and conflict safeguards passed (ROLLBACK)' as outcome;
rollback;
