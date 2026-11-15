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
do $approve$
declare r jsonb;
begin
 r:=public.beger_g47_approve_salon_booking(
  (select business_id from g51_case),(select booking_id from g51_case));
 if r->>'status'<>'confirmed' then raise exception 'Approval unsuccessful';end if;
end $approve$;
reset role;
-- Move only the fixture's booked time into the onsite arrival window. Rolled back.
update public.salon_bookings set starts_at=now()+interval '30 minutes',
 ends_at=now()+interval '80 minutes' where id=(select booking_id from g51_case);
set local role anon;
do $arrival$
declare r jsonb;
begin
 r:=public.beger_g53_request_arrival((select token from g51_case));
 if r->>'status'<>'awaiting_staff_verification' or r->>'physical_presence_verified'<>'false'
    or r->>'already_requested'<>'false' then
   raise exception 'Anonymous arrival request incorrect: %',r;end if;
 r:=public.beger_g53_request_arrival((select token from g51_case));
 if r->>'already_requested'<>'true' then raise exception 'Duplicate arrival request not idempotent';end if;
 begin
  perform public.beger_g53_request_arrival(repeat('b',64));
  raise exception 'SECURITY invalid arrival token accepted';
 exception when sqlstate '42501' then null;end;
end $arrival$;
reset role;
select set_config('request.jwt.claim.sub',(select worker_id::text from g51_case),true);
set local role authenticated;
do $worker$
declare w jsonb;r jsonb;found_request boolean:=false;
begin
 w:=public.beger_g47_salon_workspace((select business_id from g51_case));
 select exists(select 1 from pg_catalog.jsonb_array_elements(w->'bookings') j
 where j->>'id'=(select booking_id::text from g51_case)
 and j->>'arrival_requested_at' is not null) into found_request;
 if not found_request then raise exception 'Arrival intent hidden from authorized worker';end if;
 r:=public.beger_g52_salon_booking_stage((select business_id from g51_case),
  (select booking_id from g51_case),'arrived');
 if r->>'status'<>'arrived' or r->>'event_recorded'<>'true' then
  raise exception 'Authenticated arrival verification failed';end if;
end $worker$;
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
select 'G53 onsite arrival request and staff verified confirmation passed (ROLLBACK)' as outcome;
rollback;
