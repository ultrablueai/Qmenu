-- G47 staging rollback acceptance: owner, assigned worker and tenant boundary.
begin;
create temp table g47_case(
 business_id uuid,foreign_business_id uuid,branch_id uuid,
 owner_id uuid,worker_id uuid,service_id uuid,
 staff_worker uuid,staff_other uuid,booking_worker uuid,booking_other uuid,booking_mixed uuid
) on commit drop;
grant select on g47_case to authenticated;
do $setup$
declare
 b uuid;f uuid;branch uuid;fb uuid;ow uuid;wk uuid;s uuid;
 sw uuid;so uuid;bw uuid;bo uuid;bm uuid;
begin
 select user_id into ow from public.memberships where role='owner' order by created_at limit 1;
 select user_id into wk from public.memberships where role='staff' and user_id<>ow order by created_at limit 1;
 if ow is null or wk is null then raise exception 'Missing owner and staff staging actors';end if;
 insert into public.businesses(name,country_code) values('G47 rollback salon demo','TR') returning id into b;
 insert into public.businesses(name,country_code) values('G47 rollback foreign salon','TR') returning id into f;
 insert into public.branches(name,business_id) values('G47 first branch',b) returning id into branch;
 insert into public.branches(name,business_id) values('G47 foreign branch',f) returning id into fb;
 insert into public.memberships(business_id,user_id,role) values(b,ow,'owner'),(b,wk,'staff');
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 values(b,branch,wk,'My assigned worker') returning id into sw;
 insert into public.salon_staff(business_id,branch_id,user_id,display_name)
 values(b,branch,ow,'Other worker') returning id into so;
 insert into public.salon_services(business_id,name,duration_minutes,price_minor)
 values(b,'Cut',30,35000) returning id into s;
 insert into public.salon_bookings(business_id,branch_id,customer_name,starts_at,ends_at,total_minor,collected_minor)
 values(b,branch,'Worker customer',now()+interval '1 day',now()+interval '1 day 30 minutes',35000,0) returning id into bw;
 insert into public.salon_bookings(business_id,branch_id,customer_name,starts_at,ends_at,total_minor,collected_minor)
 values(b,branch,'Other customer',now()+interval '2 days',now()+interval '2 days 30 minutes',35000,0) returning id into bo;
 insert into public.salon_bookings(business_id,branch_id,customer_name,starts_at,ends_at,total_minor,collected_minor)
 values(b,branch,'Mixed workers customer',now()+interval '3 days',now()+interval '3 days 60 minutes',70000,0) returning id into bm;
 insert into public.salon_booking_services(business_id,booking_id,service_id,staff_id,line_number,duration_minutes,price_minor,starts_at,ends_at)
 values
 (b,bw,s,sw,1,30,35000,now()+interval '1 day',now()+interval '1 day 30 minutes'),
 (b,bo,s,so,1,30,35000,now()+interval '2 days',now()+interval '2 days 30 minutes'),
 (b,bm,s,sw,1,30,35000,now()+interval '3 days',now()+interval '3 days 30 minutes'),
 (b,bm,s,so,2,30,35000,now()+interval '3 days 30 minutes',now()+interval '3 days 60 minutes');
 insert into g47_case values(b,f,branch,ow,wk,s,sw,so,bw,bo,bm);
end $setup$;
select set_config('request.jwt.claim.sub',(select worker_id::text from g47_case),true);
set local role authenticated;
do $worker$
declare w jsonb; r jsonb;
begin
 w:=public.beger_g47_salon_workspace((select business_id from g47_case));
 if w->>'scope'<>'assigned_staff' or pg_catalog.jsonb_array_length(w->'staff')<>1
  or pg_catalog.jsonb_array_length(w->'bookings')<>2 then
  raise exception 'Staff workspace scope wrong: %',w;end if;
 if w::text like '%Other customer%' or w::text like '%35000%"total_minor"%' then
  raise exception 'Staff workspace leaked other customer or business totals';end if;
 begin
  perform public.beger_g47_salon_workspace((select foreign_business_id from g47_case));
  raise exception 'SECURITY: foreign tenant workspace access';
 exception when sqlstate '42501' then null;end;
 begin
  perform public.beger_g47_approve_salon_booking((select business_id from g47_case),(select booking_other from g47_case));
  raise exception 'SECURITY: worker approved another worker booking';
 exception when sqlstate '42501' then null;end;
 begin
  perform public.beger_g47_approve_salon_booking((select business_id from g47_case),(select booking_mixed from g47_case));
  raise exception 'SECURITY: worker approved mixed assignment';
 exception when sqlstate '42501' then null;end;
 r:=public.beger_g47_approve_salon_booking((select business_id from g47_case),(select booking_worker from g47_case));
 if r->>'status'<>'confirmed' or r->>'actor_role'<>'staff' or r->>'audit_recorded'<>'true'
  then raise exception 'Worker approval wrong: %',r;end if;
 begin
  perform public.beger_g47_approve_salon_booking((select business_id from g47_case),(select booking_worker from g47_case));
  raise exception 'SECURITY: duplicate booking approval';
 exception when sqlstate '22023' then null;end;
end $worker$;
select set_config('request.jwt.claim.sub',(select owner_id::text from g47_case),true);
do $owner$
declare w jsonb;r jsonb;
begin
 w:=public.beger_g47_salon_workspace((select business_id from g47_case));
 if w->>'scope'<>'whole_business' or pg_catalog.jsonb_array_length(w->'staff')<>2
  or pg_catalog.jsonb_array_length(w->'bookings')<>3 then
  raise exception 'Owner workspace scope wrong: %',w;end if;
 r:=public.beger_g47_approve_salon_booking((select business_id from g47_case),(select booking_mixed from g47_case));
 if r->>'status'<>'confirmed' then raise exception 'Owner approval failed';end if;
end $owner$;
reset role;
select
 (select count(*) from public.salon_bookings b join g47_case c on b.business_id=c.business_id where b.status='confirmed') as confirmed_bookings,
 (select count(*) from public.salon_booking_events e join g47_case c on e.business_id=c.business_id where e.event_type='approved') as approval_events,
 (select count(*) from public.salon_bookings b join g47_case c on b.id=c.booking_other where b.status='pending') as other_worker_still_pending;
rollback;
