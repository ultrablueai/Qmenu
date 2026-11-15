-- G51 public salon reservation API (staging pilot). Public access requires explicit owner opt-in.
-- No direct table access. A random, per-booking bearer token grants read of that booking status only.
create table if not exists public.salon_public_links (
 business_id uuid primary key references public.businesses(id) on delete cascade,
 slug text not null unique check(slug ~ '^salon-[a-f0-9]{24}$'),
 published boolean not null default false,
 public_booking_enabled boolean not null default false,
 created_at timestamptz not null default now(),
 constraint salon_public_booking_requires_published check(not public_booking_enabled or published)
);
create table if not exists public.salon_customer_access (
 booking_id uuid primary key,
 business_id uuid not null,
 access_hash text not null unique,
 created_at timestamptz not null default now(),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade
);
create index if not exists salon_booking_public_rate on public.salon_bookings(business_id,created_at,source);
alter table public.salon_public_links enable row level security;
alter table public.salon_customer_access enable row level security;
revoke all on public.salon_public_links,public.salon_customer_access from public,anon,authenticated;

create or replace function public.beger_g51_owner_salon_link(p_business uuid,p_publish boolean,p_enable_bookings boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_slug text;
begin
 if v_actor is null or not exists(select 1 from public.memberships
   where business_id=p_business and user_id=v_actor and role='owner') then
  raise exception 'Only salon owner can publish this salon' using errcode='42501';end if;
 if p_publish is null or p_enable_bookings is null or (p_enable_bookings and not p_publish) then
  raise exception 'Invalid public link state' using errcode='22023';end if;
 insert into public.salon_public_links(business_id,slug)
 values(p_business,'salon-'||substring(replace(pg_catalog.gen_random_uuid()::text,'-','') from 1 for 24))
 on conflict(business_id) do nothing;
 update public.salon_public_links set published=p_publish,public_booking_enabled=p_enable_bookings
 where business_id=p_business returning slug into v_slug;
 return pg_catalog.jsonb_build_object('slug',v_slug,'published',p_publish,
   'public_booking_enabled',p_enable_bookings);
end;
$$;
revoke all on function public.beger_g51_owner_salon_link(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.beger_g51_owner_salon_link(uuid,boolean,boolean) to authenticated;

create or replace function public.beger_g51_public_salon_catalog(p_slug text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_name text;v_enabled boolean;
begin
 select p.business_id,b.name,p.public_booking_enabled into v_business,v_name,v_enabled
 from public.salon_public_links p join public.businesses b on b.id=p.business_id
 where p.slug=p_slug and p.published;
 if v_business is null then raise exception 'Salon not found' using errcode='22023';end if;
 return pg_catalog.jsonb_build_object('salon_name',v_name,'slug',p_slug,
  'public_booking_enabled',v_enabled,'timezone','Europe/Istanbul',
  'branches',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',x.id,'name',x.name))
    from public.branches x where x.business_id=v_business
      and exists(select 1 from public.salon_staff s where s.business_id=v_business and s.branch_id=x.id
        and s.active and s.accepts_bookings)),'[]'::jsonb),
  'staff',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',x.id,
       'name',x.display_name,'branch_id',x.branch_id))
    from public.salon_staff x where x.business_id=v_business and x.active and x.accepts_bookings),'[]'::jsonb),
  'chairs',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',c.id,
      'label',c.label,'branch_id',c.branch_id))
     from public.salon_chairs c where c.business_id=v_business and c.active),'[]'::jsonb),
  'services',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',s.id,
       'name',s.name,'duration_minutes',s.duration_minutes,
       'price_minor',s.price_minor,'currency',s.currency))
     from public.salon_services s where s.business_id=v_business and s.active),'[]'::jsonb),
  'offers',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('staff_id',z.staff_id,'service_id',z.service_id))
     from public.salon_staff_services z join public.salon_staff st on st.id=z.staff_id
     where z.business_id=v_business and z.active and st.active and st.accepts_bookings),'[]'::jsonb));
end;
$$;
revoke all on function public.beger_g51_public_salon_catalog(text) from public,anon,authenticated;
grant execute on function public.beger_g51_public_salon_catalog(text) to anon,authenticated;

create or replace function public.beger_g51_public_book(
 p_slug text,p_name text,p_branch uuid,p_staff uuid,p_chair uuid,p_services uuid[],p_start timestamptz)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_business uuid;v_name text:=pg_catalog.btrim(coalesce(p_name,''));v_booking uuid;
 v_service public.salon_services%rowtype;v_s public.salon_staff%rowtype;v_schedule public.salon_staff_schedules%rowtype;
 v_cursor timestamptz;v_finish timestamptz;v_local timestamp;v_end_local timestamp;
 v_total bigint:=0;v_currency text;v_id uuid;v_ix integer:=0;v_minutes integer;v_token text;
begin
 select business_id into v_business from public.salon_public_links
 where slug=p_slug and published and public_booking_enabled;
 if v_business is null then raise exception 'Public booking unavailable' using errcode='42501';end if;
 if pg_catalog.char_length(v_name) not between 2 and 70 or
    pg_catalog.cardinality(p_services) not between 1 and 6 or
    (select count(distinct z) from pg_catalog.unnest(p_services) z)<>pg_catalog.cardinality(p_services) or
    p_start is null or p_start<now()+interval '20 minutes' or p_start>now()+interval '30 days' then
   raise exception 'Invalid public booking' using errcode='22023';end if;
 -- Same tenant advisory lock as authenticated booking, prevents cross-channel collisions.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_business::text,4818));
 if (select count(*) from public.salon_bookings where business_id=v_business and
   source='public_qr' and created_at>now()-interval '1 hour')>=12 then
  raise exception 'Public booking rate temporarily reached' using errcode='42901';end if;
 if (select count(*) from public.salon_bookings where business_id=v_business
   and customer_name=v_name and created_at>now()-interval '1 day')>=2 then
  raise exception 'Too many reservations with same name' using errcode='42901';end if;
 select * into v_s from public.salon_staff where business_id=v_business and branch_id=p_branch
  and id=p_staff and active and accepts_bookings;
 if not found then raise exception 'Staff is not available' using errcode='22023';end if;
 if not exists(select 1 from public.salon_chairs where business_id=v_business
   and branch_id=p_branch and id=p_chair and active) then
  raise exception 'Chair is not available' using errcode='22023';end if;
 v_local:=p_start at time zone 'Europe/Istanbul';
 select * into v_schedule from public.salon_staff_schedules where business_id=v_business
  and staff_id=p_staff and weekday=extract(dow from v_local);
 if not found or v_local::time<v_schedule.opens_at or v_local::time>=v_schedule.closes_at then
  raise exception 'Outside staff working hours' using errcode='22023';end if;
 v_cursor:=p_start;
 foreach v_id in array p_services loop
  select * into v_service from public.salon_services where business_id=v_business and id=v_id and active;
  if not found or not exists(select 1 from public.salon_staff_services
     where business_id=v_business and staff_id=p_staff and service_id=v_id and active) then
   raise exception 'Unsupported service selection' using errcode='22023';end if;
  if v_currency is not null and v_currency<>v_service.currency then
    raise exception 'Mixed currency basket' using errcode='22023';end if;
  v_currency:=v_service.currency;
  v_total:=v_total+v_service.price_minor;
  v_minutes:=v_service.duration_minutes+v_service.buffer_minutes+v_schedule.gap_minutes;
  v_finish:=v_cursor+pg_catalog.make_interval(mins=>v_minutes);
  v_end_local:=v_finish at time zone 'Europe/Istanbul';
  if v_end_local::date<>v_local::date or v_end_local::time>v_schedule.closes_at or
    (v_schedule.break_start is not null and
      (v_cursor at time zone 'Europe/Istanbul')<v_local::date+v_schedule.break_end and
       v_end_local>v_local::date+v_schedule.break_start) then
   raise exception 'Overlap with break or closing time' using errcode='22023';end if;
  if exists(select 1 from public.salon_booking_services z
    join public.salon_bookings b on b.business_id=z.business_id and b.id=z.booking_id
    where z.business_id=v_business and b.status not in ('cancelled','no_show')
     and (z.staff_id=p_staff or z.chair_id=p_chair)
     and z.starts_at<v_finish and z.ends_at>v_cursor) then
   raise exception 'Appointment slot is occupied' using errcode='23P01';end if;
  v_cursor:=v_finish;
 end loop;
 insert into public.salon_bookings(business_id,branch_id,customer_name,status,source,
  starts_at,ends_at,currency,total_minor,collected_minor)
 values(v_business,p_branch,v_name,'pending','public_qr',p_start,v_cursor,v_currency,v_total,0)
 returning id into v_booking;
 v_cursor:=p_start;
 foreach v_id in array p_services loop
  select * into v_service from public.salon_services where business_id=v_business and id=v_id;
  v_minutes:=v_service.duration_minutes+v_service.buffer_minutes+v_schedule.gap_minutes;
  insert into public.salon_booking_services(business_id,booking_id,service_id,staff_id,chair_id,
    line_number,duration_minutes,buffer_minutes,price_minor,starts_at,ends_at)
  values(v_business,v_booking,v_id,p_staff,p_chair,
    (select count(*)+1 from public.salon_booking_services where business_id=v_business and booking_id=v_booking),
    v_service.duration_minutes,v_service.buffer_minutes+v_schedule.gap_minutes,v_service.price_minor,
    v_cursor,v_cursor+pg_catalog.make_interval(mins=>v_minutes));
  v_cursor:=v_cursor+pg_catalog.make_interval(mins=>v_minutes);
 end loop;
 v_token:=replace(pg_catalog.gen_random_uuid()::text,'-','')||replace(pg_catalog.gen_random_uuid()::text,'-','');
 insert into public.salon_customer_access(business_id,booking_id,access_hash)
 values(v_business,v_booking,pg_catalog.md5(v_token));
 insert into public.salon_booking_events(business_id,booking_id,actor_id,event_type)
 values(v_business,v_booking,null,'requested');
 return pg_catalog.jsonb_build_object('booking_id',v_booking,'access_token',v_token,
  'status','pending','services',pg_catalog.cardinality(p_services),
  'starts_at',p_start,'ends_at',v_cursor,'total_minor',v_total,
  'currency',v_currency,'notifications_enabled',false);
end;
$$;
revoke all on function public.beger_g51_public_book(text,text,uuid,uuid,uuid,uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.beger_g51_public_book(text,text,uuid,uuid,uuid,uuid[],timestamptz) to anon,authenticated;

create or replace function public.beger_g51_public_track(p_token text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_booking public.salon_bookings%rowtype;
begin
 if pg_catalog.char_length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Invalid booking tracking token' using errcode='42501';end if;
 select b.* into v_booking from public.salon_customer_access t
  join public.salon_bookings b on b.business_id=t.business_id and b.id=t.booking_id
 where t.access_hash=pg_catalog.md5(p_token);
 if not found then raise exception 'Booking tracking unavailable' using errcode='42501';end if;
 return pg_catalog.jsonb_build_object('id',v_booking.id,'status',v_booking.status,
  'starts_at',v_booking.starts_at,'ends_at',v_booking.ends_at,
  'total_minor',v_booking.total_minor,'currency',v_booking.currency,
  'last_update',v_booking.updated_at);
end;
$$;
revoke all on function public.beger_g51_public_track(text) from public,anon,authenticated;
grant execute on function public.beger_g51_public_track(text) to anon,authenticated;
