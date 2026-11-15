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
create temp table g60_other(business_id uuid) on commit drop;
grant select on g60_other to authenticated;
with fresh as (insert into public.businesses(name,country_code)
values('G60 foreign rollback salon','TR') returning id)
insert into g60_other select id from fresh;
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
do $marketing_denied$
declare c g51_case%rowtype;
begin
 select * into c from g51_case;
 begin
  perform public.beger_g59_upsert_membership_plan(c.business_id,null,'VIP plan',
   'Test',10000,1,3,true);
  raise exception 'SECURITY worker created a plan';
 exception when sqlstate '42501' then null;end;
 begin
  perform public.beger_g60_upsert_banner(c.business_id,null,'VIP offer','Test',
   now()-interval '1 day',now()+interval '2 days',true);
  raise exception 'SECURITY worker created a banner';
 exception when sqlstate '42501' then null;end;
end $marketing_denied$;
reset role;
select set_config('request.jwt.claim.sub',(select owner_id::text from g51_case),true);
set local role authenticated;
do $owner_campaign$
declare c g51_case%rowtype;r jsonb;other uuid;
begin
 select * into c from g51_case;
 r:=public.beger_g59_upsert_membership_plan(c.business_id,null,'Monthly VIP',
  'Two haircuts per month',60000,1,2,true);
 if r->>'checkout_enabled'<>'false' then raise exception 'Membership incorrectly accepts payment';end if;
 r:=public.beger_g60_upsert_banner(c.business_id,null,'Early haircut deal',
  'Save on morning visits',now()-interval '1 day',now()+interval '1 day',true);
 if r->>'outbound_notifications_enabled'<>'false' then
  raise exception 'Marketing banner unexpectedly sent notifications';end if;
 r:=public.beger_g60_upsert_banner(c.business_id,null,'Expired old offer',
  'Do not display',now()-interval '3 days',now()-interval '1 day',true);
 other:=(select business_id from g60_other);
 begin
  perform public.beger_g59_upsert_membership_plan(other,null,'Foreign plan','Test',10000,1,1,true);
  raise exception 'SECURITY cross tenant plan inserted';
 exception when sqlstate '42501' then null;end;
end $owner_campaign$;
reset role;
set local role anon;
do $public_campaign$
declare c g51_case%rowtype;r jsonb;
begin
 select * into c from g51_case;
 r:=public.beger_g59_g60_public_promotions(c.slug);
 if pg_catalog.jsonb_array_length(r->'plans')<>1 or
  pg_catalog.jsonb_array_length(r->'banners')<>1 or
  r->>'membership_checkout_enabled'<>'false' or
  r->>'marketing_push_enabled'<>'false' then
  raise exception 'Public promotion filtering or payment flag incorrect: %',r;end if;
 begin
  perform public.beger_g59_g60_public_promotions('salon-'||repeat('0',24));
  raise exception 'SECURITY queried unpublished tenant campaigns';
 exception when sqlstate '22023' then null;end;
end $public_campaign$;
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
select 'G59/G60 owner-only plans, consent-safe banners and publication windows passed (ROLLBACK)' as outcome;
rollback;
