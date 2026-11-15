-- Beger G49: owner-only pilot provisioning; does not enable public bookings.
create or replace function public.beger_g49_setup_salon_pilot(
 p_business uuid,p_branch_name text,p_worker_user uuid,p_worker_name text,
 p_chair_label text,p_service_name text,p_duration integer,p_price_minor bigint
)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_actor uuid:=(select auth.uid());
 v_branch uuid;v_staff uuid;v_chair uuid;v_service uuid;
 v_day integer;
begin
 if v_actor is null or p_business is null or p_worker_user is null then
  raise exception 'Salon owner authentication required' using errcode='42501';end if;
 if not exists(select 1 from public.memberships m where m.business_id=p_business
   and m.user_id=v_actor and m.role='owner') then
  raise exception 'Only salon owner can provision pilot resources' using errcode='42501';end if;
 if not exists(select 1 from public.memberships m where m.business_id=p_business
   and m.user_id=p_worker_user and m.role in ('owner','manager','staff')) then
  raise exception 'Worker must be an existing member of this salon' using errcode='42501';end if;
 if not exists(select 1 from public.businesses b where b.id=p_business and b.country_code='TR') then
  raise exception 'Pilot available to TR businesses only' using errcode='22023';end if;
 if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_branch_name,''))) not between 2 and 80
  or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_worker_name,''))) not between 2 and 80
  or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_chair_label,''))) not between 1 and 50
  or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_service_name,''))) not between 2 and 100
  or p_duration not between 5 and 480 or p_price_minor not between 0 and 100000000 then
  raise exception 'Invalid pilot resource details' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4900));
 -- One setup record per owner request; no customer records touched.
 insert into public.branches(business_id,name)
 values(p_business,pg_catalog.btrim(p_branch_name)) returning id into v_branch;
 insert into public.salon_staff(business_id,branch_id,user_id,display_name,kind,active,accepts_bookings)
 values(p_business,v_branch,p_worker_user,pg_catalog.btrim(p_worker_name),'barber',true,true)
 returning id into v_staff;
 insert into public.salon_chairs(business_id,branch_id,label)
 values(p_business,v_branch,pg_catalog.btrim(p_chair_label)) returning id into v_chair;
 insert into public.salon_services(business_id,name,duration_minutes,buffer_minutes,price_minor,currency)
 values(p_business,pg_catalog.btrim(p_service_name),p_duration,0,p_price_minor,'TRY')
 returning id into v_service;
 insert into public.salon_staff_services(business_id,staff_id,service_id)
 values(p_business,v_staff,v_service);
 for v_day in 0..6 loop
  insert into public.salon_staff_schedules(business_id,staff_id,weekday,opens_at,closes_at,
  gap_minutes,break_start,break_end)
  values(p_business,v_staff,v_day,'09:00','19:00',10,'13:00','14:00');
 end loop;
 return pg_catalog.jsonb_build_object(
  'branch_id',v_branch,'staff_id',v_staff,'chair_id',v_chair,'service_id',v_service,
  'status','pilot_ready','public_booking_enabled',false,'notifications_enabled',false,
  'default_hours','09:00-19:00','default_break','13:00-14:00','gap_minutes',10);
end;
$$;
revoke all on function public.beger_g49_setup_salon_pilot(uuid,text,uuid,text,text,text,integer,bigint) from public,anon,authenticated;
grant execute on function public.beger_g49_setup_salon_pilot(uuid,text,uuid,text,text,text,integer,bigint) to authenticated;
