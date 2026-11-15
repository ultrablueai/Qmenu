-- G58 first release: owner-controlled prices for public booking, fail-closed quote-only mode.
create table if not exists public.salon_price_policies(
 business_id uuid not null,
 service_id uuid not null,
 mode text not null default 'exact_price' check(mode in ('exact_price','starting_at','quote_required')),
 start_minor bigint,
 updated_at timestamptz not null default now(),
 updated_by uuid not null,
 primary key(business_id,service_id),
 foreign key(business_id,service_id) references public.salon_services(business_id,id) on delete cascade,
 check((mode='starting_at' and start_minor is not null and start_minor>=0) or
       (mode<>'starting_at' and start_minor is null))
);
alter table public.salon_price_policies enable row level security;
revoke all on public.salon_price_policies from public,anon,authenticated;

create or replace function public.beger_g58_owner_price_setup(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or not exists(select 1 from public.memberships
  where business_id=p_business and user_id=v_actor and role='owner') then
  raise exception 'Owner permission required' using errcode='42501';end if;
 return pg_catalog.jsonb_build_object('business_id',p_business,
 'services',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',s.id,'name',s.name,'price_minor',s.price_minor,'currency',s.currency,
  'mode',coalesce(p.mode,'exact_price'),'start_minor',p.start_minor)
  order by s.name) from public.salon_services s
  left join public.salon_price_policies p on p.business_id=s.business_id and p.service_id=s.id
  where s.business_id=p_business and s.active),'[]'::jsonb),
 'quote_booking_enabled',false,'public_base_price_default','exact_price');
end;
$$;
revoke all on function public.beger_g58_owner_price_setup(uuid) from public,anon,authenticated;
grant execute on function public.beger_g58_owner_price_setup(uuid) to authenticated;

create or replace function public.beger_g58_owner_set_price(
 p_business uuid,p_service uuid,p_mode text,p_start_minor bigint)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_base bigint;
begin
 if v_actor is null or not exists(select 1 from public.memberships
  where business_id=p_business and user_id=v_actor and role='owner') then
  raise exception 'Only owner can change public price visibility' using errcode='42501';end if;
 select price_minor into v_base from public.salon_services
 where business_id=p_business and id=p_service and active;
 if not found then raise exception 'Service not in salon' using errcode='22023';end if;
 if p_mode is null or p_mode not in ('exact_price','starting_at','quote_required') or
   (p_mode='starting_at' and (p_start_minor is null or p_start_minor<0 or p_start_minor>v_base)) or
   (p_mode<>'starting_at' and p_start_minor is not null) then
  raise exception 'Invalid price display or starting price' using errcode='22023';end if;
 insert into public.salon_price_policies(business_id,service_id,mode,start_minor,updated_by)
 values(p_business,p_service,p_mode,p_start_minor,v_actor)
 on conflict(business_id,service_id) do update set
 mode=excluded.mode,start_minor=excluded.start_minor,updated_by=excluded.updated_by,updated_at=now();
 return pg_catalog.jsonb_build_object('service_id',p_service,'mode',p_mode,
  'start_minor',p_start_minor,'staging_only',true,'booking_needs_exact_price',p_mode<>'exact_price');
end;
$$;
revoke all on function public.beger_g58_owner_set_price(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.beger_g58_owner_set_price(uuid,uuid,text,bigint) to authenticated;

-- Preserve G51 RPC name so deployed public URLs remain functional and don't expose old prices.
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
       'price_minor',case when coalesce(pp.mode,'exact_price')='exact_price' then s.price_minor when pp.mode='starting_at' then pp.start_minor else null end,
       'currency',s.currency,'price_mode',coalesce(pp.mode,'exact_price'),
       'price_is_final',coalesce(pp.mode,'exact_price')='exact_price'))
     from public.salon_services s
     left join public.salon_price_policies pp on pp.business_id=s.business_id and pp.service_id=s.id
     where s.business_id=v_business and s.active),'[]'::jsonb),
  'offers',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('staff_id',z.staff_id,'service_id',z.service_id))
     from public.salon_staff_services z join public.salon_staff st on st.id=z.staff_id
     where z.business_id=v_business and z.active and st.active and st.accepts_bookings),'[]'::jsonb));
end;
$$;

-- A price marked negotiable must not silently become a fixed-price booking.
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
  if exists(select 1 from public.salon_price_policies pol
     where pol.business_id=v_business and pol.service_id=v_id and pol.mode<>'exact_price') then
     raise exception 'This service requires a personalized quote before booking' using errcode='22023';end if;
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

