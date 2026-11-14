-- Beger G48: Safe pilot booking workflow. Authenticated owner/manager or assigned staff only.
-- Atomic per-business scheduling, multi-item basket, chair + staff occupancy, no public write.
create or replace function public.beger_g48_create_salon_booking(
 p_business uuid, p_branch uuid, p_customer_name text,
 p_staff uuid, p_chair uuid, p_services uuid[], p_starts_at timestamptz
)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
 v_actor uuid := (select auth.uid());
 v_role text;
 v_name text := pg_catalog.btrim(coalesce(p_customer_name,''));
 v_staff public.salon_staff%rowtype;
 v_chair public.salon_chairs%rowtype;
 v_service public.salon_services%rowtype;
 v_booking uuid;
 v_start timestamptz := p_starts_at;
 v_cursor timestamptz;
 v_finish timestamptz;
 v_local_start timestamp;
 v_local_finish timestamp;
 v_open time;
 v_close time;
 v_break_start time;
 v_break_end time;
 v_schedule public.salon_staff_schedules%rowtype;
 v_gap integer;
 v_total bigint := 0;
 v_currency char(3);
 v_index integer := 0;
 v_id uuid;
 v_service_minutes integer;
begin
 if v_actor is null or p_business is null or p_branch is null or p_staff is null
  or p_chair is null or p_starts_at is null then
  raise exception 'Authenticated salon booking required' using errcode='42501';
 end if;
 select m.role into v_role from public.memberships m
 where m.business_id=p_business and m.user_id=v_actor
  and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then
  raise exception 'Salon booking is not authorized' using errcode='42501';
 end if;
 if pg_catalog.char_length(v_name)<2 or pg_catalog.char_length(v_name)>100
    or pg_catalog.cardinality(p_services) is null
    or pg_catalog.cardinality(p_services)<1 or pg_catalog.cardinality(p_services)>8
    or (select count(distinct x) from pg_catalog.unnest(p_services) x)
        <>pg_catalog.cardinality(p_services) then
  raise exception 'Invalid name or service basket' using errcode='22023';
 end if;
 if p_starts_at <= now() or p_starts_at > now()+interval '60 days' then
  raise exception 'Booking start must be within 60 days' using errcode='22023';
 end if;
 -- Serialize all salon appointments per tenant, independent of the access path.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4818));
 select * into v_staff from public.salon_staff s
  where s.business_id=p_business and s.branch_id=p_branch
   and s.id=p_staff and s.active and s.accepts_bookings;
 if not found then raise exception 'Worker unavailable in branch' using errcode='22023';end if;
 if v_role='staff' and v_staff.user_id is distinct from v_actor then
  raise exception 'Staff may book only their own calendar' using errcode='42501';
 end if;
 select * into v_chair from public.salon_chairs c where c.business_id=p_business
  and c.branch_id=p_branch and c.id=p_chair and c.active;
 if not found then raise exception 'Chair unavailable in branch' using errcode='22023';end if;
 v_local_start := p_starts_at at time zone 'Europe/Istanbul';
 select * into v_schedule from public.salon_staff_schedules s where
  s.business_id=p_business and s.staff_id=p_staff
  and s.weekday=pg_catalog.extract(dow from v_local_start);
 if not found then
  raise exception 'No scheduled working shift for this weekday' using errcode='22023';
 end if;
 v_open:=v_schedule.opens_at;
 v_close:=v_schedule.closes_at;
 v_break_start:=v_schedule.break_start;
 v_break_end:=v_schedule.break_end;
 v_gap:=v_schedule.gap_minutes;
 if v_local_start::time<v_open or v_local_start::time>=v_close then
  raise exception 'Booking outside working shift' using errcode='22023';
 end if;
 if v_break_start is not null and v_local_start::time<v_break_end and
    v_local_start::time>=v_break_start then
  raise exception 'Booking starts during staff break' using errcode='22023';
 end if;
 v_cursor:=p_starts_at;
 foreach v_id in array p_services loop
  select * into v_service from public.salon_services s where
   s.id=v_id and s.business_id=p_business and s.active;
  if not found then raise exception 'Service unavailable' using errcode='22023';end if;
  if not exists (select 1 from public.salon_staff_services x where
   x.business_id=p_business and x.staff_id=p_staff and
   x.service_id=v_id and x.active) then
    raise exception 'Staff does not offer this service' using errcode='22023';
  end if;
  if v_currency is not null and v_currency<>v_service.currency then
   raise exception 'Cannot mix currencies in one booking' using errcode='22023';
  end if;
  v_currency:=v_service.currency;
  v_index:=v_index+1;
  v_total:=v_total+v_service.price_minor;
  -- Occupancy includes per-service cleanup plus the staff's configured gap.
  v_service_minutes:=v_service.duration_minutes+v_service.buffer_minutes+v_gap;
  v_finish:=v_cursor+pg_catalog.make_interval(mins=>v_service_minutes);
  v_local_finish:=v_finish at time zone 'Europe/Istanbul';
  if v_local_finish::date<>v_local_start::date or v_local_finish::time>v_close
    or (v_break_start is not null and
      v_cursor at time zone 'Europe/Istanbul'<v_local_start::date+v_break_end
      and v_local_finish>v_local_start::date+v_break_start) then
   raise exception 'Selected services overlap break or closing time' using errcode='22023';
  end if;
  if exists (
    select 1 from public.salon_booking_services sl
    join public.salon_bookings b on b.business_id=sl.business_id and b.id=sl.booking_id
    where sl.business_id=p_business and b.status not in ('cancelled','no_show')
      and (sl.staff_id=p_staff or sl.chair_id=p_chair)
      and sl.starts_at<v_finish and sl.ends_at>v_cursor
  ) then
    raise exception 'Requested slot collides with staff or chair' using errcode='23P01';
  end if;
  v_cursor:=v_finish;
 end loop;
 insert into public.salon_bookings(business_id,branch_id,customer_name,status,source,
  starts_at,ends_at,currency,total_minor,collected_minor)
 values(p_business,p_branch,v_name,'pending','staff_pilot',
  p_starts_at,v_cursor,v_currency,v_total,0) returning id into v_booking;
 v_cursor:=p_starts_at;
 foreach v_id in array p_services loop
  select * into v_service from public.salon_services where
   business_id=p_business and id=v_id;
  v_cursor:=v_cursor+pg_catalog.make_interval(
   mins=>v_service.duration_minutes+v_service.buffer_minutes+v_gap);
  insert into public.salon_booking_services(
   business_id,booking_id,service_id,staff_id,chair_id,line_number,duration_minutes,
   buffer_minutes,price_minor,starts_at,ends_at)
  values(p_business,v_booking,v_id,p_staff,p_chair,
   (select count(*)+1 from public.salon_booking_services
      where business_id=p_business and booking_id=v_booking),
   v_service.duration_minutes,v_service.buffer_minutes+v_gap,
   v_service.price_minor,
   v_cursor-pg_catalog.make_interval(mins=>v_service.duration_minutes+v_service.buffer_minutes+v_gap),
   v_cursor);
 end loop;
 insert into public.salon_booking_events(business_id,booking_id,actor_id,event_type)
 values(p_business,v_booking,v_actor,'requested');
 return pg_catalog.jsonb_build_object('booking_id',v_booking,'state','pending',
  'starts_at',p_starts_at,'ends_at',v_cursor,'service_count',pg_catalog.cardinality(p_services),
  'total_minor',v_total,'currency',v_currency,'billing_enabled',false,'public_booking_enabled',false);
end;
$$;
revoke all on function public.beger_g48_create_salon_booking(uuid,uuid,text,uuid,uuid,uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.beger_g48_create_salon_booking(uuid,uuid,text,uuid,uuid,uuid[],timestamptz) to authenticated;

create or replace function public.beger_g48_salon_booking_setup(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_staff_ids uuid[];
begin
 if v_actor is null or p_business is null then
  raise exception 'Salon setup authorization required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then
  raise exception 'Salon setup authorization required' using errcode='42501';end if;
 select coalesce(pg_catalog.array_agg(id),array[]::uuid[]) into v_staff_ids
 from public.salon_staff where business_id=p_business and user_id=v_actor and active;
 if v_role='staff' and pg_catalog.cardinality(v_staff_ids)=0 then
  raise exception 'No active staff profile' using errcode='42501';end if;
 return pg_catalog.jsonb_build_object('business_id',p_business,'role',v_role,
  'branches',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',b.id,'name',b.name))
   from public.branches b where b.business_id=p_business),'[]'::jsonb),
  'staff',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',s.id,
   'branch_id',s.branch_id,'name',s.display_name))
   from public.salon_staff s where s.business_id=p_business and s.active and s.accepts_bookings
   and (v_role in ('owner','manager') or s.id=any(v_staff_ids))),'[]'::jsonb),
  'chairs',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',c.id,
   'branch_id',c.branch_id,'label',c.label))
   from public.salon_chairs c where c.business_id=p_business and c.active
   and (v_role in ('owner','manager') or c.branch_id in(
    select s.branch_id from public.salon_staff s where s.id=any(v_staff_ids) and s.business_id=p_business))),'[]'::jsonb),
  'services',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',s.id,'name',s.name,
   'duration_minutes',s.duration_minutes,'price_minor',s.price_minor,'currency',s.currency))
   from public.salon_services s where s.business_id=p_business and s.active
   and (v_role in ('owner','manager') or exists(
    select 1 from public.salon_staff_services ss where ss.business_id=p_business
     and ss.service_id=s.id and ss.staff_id=any(v_staff_ids) and ss.active))),'[]'::jsonb),
  'public_booking_enabled',false,'limit_horizon_days',60);
end;
$$;
revoke all on function public.beger_g48_salon_booking_setup(uuid) from public,anon,authenticated;
grant execute on function public.beger_g48_salon_booking_setup(uuid) to authenticated;
