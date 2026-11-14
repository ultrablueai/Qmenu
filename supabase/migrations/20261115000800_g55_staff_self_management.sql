-- G55: authenticated staff autonomy. Owner/manager manage everyone; worker only themselves.
-- Prevent changes from silently invalidating existing active reservations.
create or replace function public.beger_g55_worker_controls(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_staff jsonb;
begin
 if v_actor is null then raise exception 'Authenticated workspace required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Worker workspace denied' using errcode='42501';end if;
 if v_role='staff' and not exists(select 1 from public.salon_staff
  where business_id=p_business and user_id=v_actor and active) then
  raise exception 'No active employee profile' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',st.id,'name',st.display_name,'accepts_bookings',st.accepts_bookings,
  'branch_id',st.branch_id,
  'shifts',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'weekday',s.weekday,'opens_at',s.opens_at,'closes_at',s.closes_at,
    'gap_minutes',s.gap_minutes,'break_start',s.break_start,'break_end',s.break_end)
    order by s.weekday) from public.salon_staff_schedules s
     where s.business_id=p_business and s.staff_id=st.id),'[]'::jsonb),
  'services',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'service_id',ss.service_id,'enabled',ss.active,'name',sv.name)
   order by sv.name) from public.salon_staff_services ss
   join public.salon_services sv on sv.business_id=ss.business_id and sv.id=ss.service_id
   where ss.business_id=p_business and ss.staff_id=st.id),'[]'::jsonb)
 ) order by st.display_name),'[]'::jsonb) into v_staff
 from public.salon_staff st where st.business_id=p_business and st.active and
  (v_role in ('owner','manager') or st.user_id=v_actor);
 return pg_catalog.jsonb_build_object('business_id',p_business,'role',v_role,
  'scope',case when v_role='staff' then 'own_only' else 'whole_business' end,
  'workers',v_staff,'realtime_write_enabled',true);
end;
$$;
revoke all on function public.beger_g55_worker_controls(uuid) from public,anon,authenticated;
grant execute on function public.beger_g55_worker_controls(uuid) to authenticated;

create or replace function public.beger_g55_set_worker_shift(
 p_business uuid,p_staff uuid,p_weekday smallint,p_open time,p_close time,
 p_gap integer,p_break_start time,p_break_end time)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_s public.salon_staff%rowtype;
begin
 if v_actor is null then raise exception 'Staff authentication required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Worker shift permission denied' using errcode='42501';end if;
 select * into v_s from public.salon_staff s where s.business_id=p_business and s.id=p_staff and s.active;
 if not found or (v_role='staff' and v_s.user_id is distinct from v_actor) then
  raise exception 'Cannot manage another employee' using errcode='42501';end if;
 if p_weekday is null or p_weekday not between 0 and 6 or
  p_open is null or p_close is null or p_open>=p_close or
  p_gap is null or p_gap not between 0 and 120 or
  ((p_break_start is null)<>(p_break_end is null)) or
  (p_break_start is not null and
     (p_break_start<p_open or p_break_end>p_close or p_break_start>=p_break_end)) then
  raise exception 'Invalid staff shift or break interval' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4818));
 if exists(select 1 from public.salon_booking_services sl
  join public.salon_bookings b on b.business_id=sl.business_id and b.id=sl.booking_id
  where sl.business_id=p_business and sl.staff_id=p_staff
   and b.status not in ('cancelled','no_show') and sl.ends_at>now()
   and extract(dow from sl.starts_at at time zone 'Europe/Istanbul')=p_weekday
   and ((sl.starts_at at time zone 'Europe/Istanbul')::time<p_open
     or (sl.ends_at at time zone 'Europe/Istanbul')::time>p_close
     or (p_break_start is not null and
        (sl.starts_at at time zone 'Europe/Istanbul')::time<p_break_end
        and (sl.ends_at at time zone 'Europe/Istanbul')::time>p_break_start))) then
  raise exception 'Existing appointments conflict with proposed shift' using errcode='23P01';end if;
 insert into public.salon_staff_schedules(business_id,staff_id,weekday,opens_at,closes_at,
  gap_minutes,break_start,break_end)
 values(p_business,p_staff,p_weekday,p_open,p_close,p_gap,p_break_start,p_break_end)
 on conflict(business_id,staff_id,weekday)
 do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,
  gap_minutes=excluded.gap_minutes,break_start=excluded.break_start,break_end=excluded.break_end;
 return pg_catalog.jsonb_build_object('staff_id',p_staff,'weekday',p_weekday,'saved',true,
  'existing_bookings_preserved',true);
end;
$$;
revoke all on function public.beger_g55_set_worker_shift(uuid,uuid,smallint,time,time,integer,time,time) from public,anon,authenticated;
grant execute on function public.beger_g55_set_worker_shift(uuid,uuid,smallint,time,time,integer,time,time) to authenticated;

create or replace function public.beger_g55_set_worker_booking_pause(p_business uuid,p_staff uuid,p_accept boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_s public.salon_staff%rowtype;
begin
 if v_actor is null or p_accept is null then raise exception 'Authentication required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Worker settings forbidden' using errcode='42501';end if;
 select * into v_s from public.salon_staff where business_id=p_business and id=p_staff and active for update;
 if not found or (v_role='staff' and v_s.user_id is distinct from v_actor) then
  raise exception 'Only own calendar can be paused' using errcode='42501';end if;
 update public.salon_staff set accepts_bookings=p_accept where business_id=p_business and id=p_staff;
 return pg_catalog.jsonb_build_object('staff_id',p_staff,'accepts_bookings',p_accept,
  'previous_appointments_unchanged',true);
end;
$$;
revoke all on function public.beger_g55_set_worker_booking_pause(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.beger_g55_set_worker_booking_pause(uuid,uuid,boolean) to authenticated;

create or replace function public.beger_g55_set_worker_service(p_business uuid,p_staff uuid,p_service uuid,p_enabled boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_s public.salon_staff%rowtype;
begin
 if v_actor is null or p_enabled is null then raise exception 'Authenticated settings required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Worker settings forbidden' using errcode='42501';end if;
 select * into v_s from public.salon_staff where business_id=p_business and id=p_staff and active;
 if not found or (v_role='staff' and v_s.user_id is distinct from v_actor) then
  raise exception 'Cannot edit another worker services' using errcode='42501';end if;
 if not exists(select 1 from public.salon_staff_services where business_id=p_business
  and staff_id=p_staff and service_id=p_service) then
  raise exception 'Service assignment not found' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4818));
 if not p_enabled and exists(select 1 from public.salon_booking_services sl
  join public.salon_bookings b on b.business_id=sl.business_id and b.id=sl.booking_id
  where sl.business_id=p_business and sl.staff_id=p_staff and sl.service_id=p_service
    and b.status not in ('cancelled','no_show') and sl.ends_at>now()) then
  raise exception 'Existing future bookings require this service' using errcode='23P01';end if;
 update public.salon_staff_services set active=p_enabled where business_id=p_business
  and staff_id=p_staff and service_id=p_service;
 return pg_catalog.jsonb_build_object('staff_id',p_staff,'service_id',p_service,'active',p_enabled,
  'future_booking_safety_checked',true);
end;
$$;
revoke all on function public.beger_g55_set_worker_service(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.beger_g55_set_worker_service(uuid,uuid,uuid,boolean) to authenticated;
