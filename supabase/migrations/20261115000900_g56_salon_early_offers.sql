-- Beger G56: time-limited voluntary early appointment offers (STAGING).
-- Customer retains original appointment unless they explicitly accept a valid offer.
create table if not exists public.salon_early_offers (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 booking_id uuid not null,
 offered_by uuid not null,
 previous_start timestamptz not null,
 proposed_start timestamptz not null,
 proposed_end timestamptz not null,
 status text not null default 'pending'
  check(status in ('pending','accepted','declined','expired','revoked')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 unique(business_id,id),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade,
 constraint early_offer_timing check(proposed_start<previous_start and proposed_start<proposed_end),
 constraint early_offer_expiry check(expires_at>created_at)
);
create unique index if not exists salon_one_pending_offer_per_booking
on public.salon_early_offers(business_id,booking_id) where status='pending';
create index if not exists salon_early_offer_pending_slots
on public.salon_early_offers(business_id,proposed_start,proposed_end) where status='pending';
alter table public.salon_early_offers enable row level security;
revoke all on public.salon_early_offers from public,anon,authenticated;

create or replace function public.beger_g56_offer_early_slot(
 p_business uuid,p_booking uuid,p_proposed_start timestamptz)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_booking public.salon_bookings%rowtype;
 v_worker uuid;v_chair uuid;v_staff_count integer;v_chair_count integer;
 v_shift public.salon_staff_schedules%rowtype;
 v_new_end timestamptz;v_local timestamp;v_local_end timestamp;v_id uuid;
begin
 if v_actor is null or p_business is null or p_booking is null or p_proposed_start is null then
  raise exception 'Authenticated worker required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
 and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Not authorized to offer an early slot' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4818));
 select * into v_booking from public.salon_bookings
 where business_id=p_business and id=p_booking for update;
 if not found or v_booking.status<>'confirmed' or
    v_booking.starts_at<=now()+interval '25 minutes' or
    p_proposed_start<now()+interval '10 minutes' or
    p_proposed_start>=v_booking.starts_at-interval '10 minutes' or
    p_proposed_start<v_booking.starts_at-interval '180 minutes' then
  raise exception 'Early slot must precede a confirmed future appointment by 10–180 minutes' using errcode='22023';end if;
 select count(distinct sl.staff_id),count(distinct sl.chair_id),
   min(sl.staff_id),min(sl.chair_id) into v_staff_count,v_chair_count,v_worker,v_chair
 from public.salon_booking_services sl where sl.business_id=p_business and sl.booking_id=p_booking;
 if v_staff_count<>1 or v_chair_count<>1 or v_chair is null then
  raise exception 'Early offers require one worker and one chair for the entire booking' using errcode='22023';end if;
 if v_role='staff' and not exists(select 1 from public.salon_staff s
  where s.business_id=p_business and s.id=v_worker and s.user_id=v_actor and s.active) then
  raise exception 'Staff may only invite their own customer' using errcode='42501';end if;
 v_new_end:=v_booking.ends_at-(v_booking.starts_at-p_proposed_start);
 v_local:=p_proposed_start at time zone 'Europe/Istanbul';
 v_local_end:=v_new_end at time zone 'Europe/Istanbul';
 if v_local::date<>(v_booking.starts_at at time zone 'Europe/Istanbul')::date or
    v_local_end::date<>v_local::date then
  raise exception 'Early offer must stay on the original appointment day' using errcode='22023';end if;
 select * into v_shift from public.salon_staff_schedules where
 business_id=p_business and staff_id=v_worker and weekday=extract(dow from v_local);
 if not found or v_local::time<v_shift.opens_at or v_local_end::time>v_shift.closes_at or
 (v_shift.break_start is not null and v_local::time<v_shift.break_end
    and v_local_end::time>v_shift.break_start) then
  raise exception 'Earlier time conflicts with worker schedule' using errcode='22023';end if;
 if exists(select 1 from public.salon_booking_services sl
   join public.salon_bookings b on b.business_id=sl.business_id and b.id=sl.booking_id
   where sl.business_id=p_business and sl.booking_id<>p_booking
    and b.status not in ('cancelled','no_show')
    and (sl.staff_id=v_worker or sl.chair_id=v_chair)
    and sl.starts_at<v_new_end and sl.ends_at>p_proposed_start) then
  raise exception 'Earlier slot already occupied' using errcode='23P01';end if;
 -- Pending offers are soft holds: reserve against *all* other invitations.
 if exists(select 1 from public.salon_early_offers e
   join public.salon_booking_services sl on sl.business_id=e.business_id and sl.booking_id=e.booking_id
   where e.business_id=p_business and e.booking_id<>p_booking
    and e.status='pending' and e.expires_at>now()
    and (sl.staff_id=v_worker or sl.chair_id=v_chair)
    and e.proposed_start<v_new_end and e.proposed_end>p_proposed_start) then
  raise exception 'Earlier slot temporarily offered to another customer' using errcode='23P01';end if;
 update public.salon_early_offers set status='expired',decided_at=now()
 where business_id=p_business and booking_id=p_booking
  and status='pending' and expires_at<=now();
 if exists(select 1 from public.salon_early_offers
  where business_id=p_business and booking_id=p_booking and status='pending') then
  raise exception 'An early offer is already waiting for this customer' using errcode='22023';end if;
 insert into public.salon_early_offers(business_id,booking_id,offered_by,previous_start,
  proposed_start,proposed_end,expires_at)
 values(p_business,p_booking,v_actor,v_booking.starts_at,p_proposed_start,v_new_end,
  now()+interval '5 minutes') returning id into v_id;
 return pg_catalog.jsonb_build_object('offer_id',v_id,'status','pending',
  'proposed_start',p_proposed_start,'expires_at',now()+interval '5 minutes',
  'customer_must_accept',true,'original_booking_unchanged',true);
end;
$$;
revoke all on function public.beger_g56_offer_early_slot(uuid,uuid,timestamptz)
 from public,anon,authenticated;
grant execute on function public.beger_g56_offer_early_slot(uuid,uuid,timestamptz) to authenticated;

create or replace function public.beger_g56_customer_early_offer(p_token text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_booking uuid;v_business uuid;v_e public.salon_early_offers%rowtype;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Invalid private booking credential' using errcode='42501';end if;
 select business_id,booking_id into v_business,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Booking credential not found' using errcode='42501';end if;
 select * into v_e from public.salon_early_offers where business_id=v_business
 and booking_id=v_booking order by created_at desc,id desc limit 1;
 if not found then return pg_catalog.jsonb_build_object('status','none');end if;
 return pg_catalog.jsonb_build_object('offer_id',v_e.id,
 'status',case when v_e.status='pending' and v_e.expires_at<=now() then 'expired'
  else v_e.status end,
 'proposed_start',v_e.proposed_start,'expires_at',v_e.expires_at,
 'original_start',v_e.previous_start,'requires_response',v_e.status='pending' and v_e.expires_at>now(),
 'original_booking_unchanged',v_e.status<>'accepted');
end;
$$;
revoke all on function public.beger_g56_customer_early_offer(text) from public,anon,authenticated;
grant execute on function public.beger_g56_customer_early_offer(text) to anon,authenticated;

create or replace function public.beger_g56_respond_early_offer(
 p_token text,p_offer uuid,p_accept boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_business uuid;v_booking uuid;v_e public.salon_early_offers%rowtype;
 v_b public.salon_bookings%rowtype;v_staff uuid;v_chair uuid;v_delta interval;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$'
 or p_offer is null or p_accept is null then
  raise exception 'Valid private booking access is required' using errcode='42501';end if;
 select business_id,booking_id into v_business,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Booking credential not found' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_business::text,4818));
 select * into v_e from public.salon_early_offers where business_id=v_business
 and booking_id=v_booking and id=p_offer for update;
 if not found or v_e.status<>'pending' then
  raise exception 'Offer not pending' using errcode='22023';end if;
 if v_e.expires_at<=now() then
  update public.salon_early_offers set status='expired',decided_at=now() where id=v_e.id;
  return pg_catalog.jsonb_build_object('status','expired','original_booking_unchanged',true);
 end if;
 if not p_accept then
  update public.salon_early_offers set status='declined',decided_at=now() where id=v_e.id;
  return pg_catalog.jsonb_build_object('status','declined','original_booking_unchanged',true);
 end if;
 select * into v_b from public.salon_bookings where business_id=v_business and id=v_booking for update;
 if not found or v_b.status<>'confirmed' or v_b.starts_at<>v_e.previous_start or
  v_e.proposed_start<now()+interval '5 minutes' then
  raise exception 'Appointment has changed or proposed time is too close' using errcode='22023';end if;
 select min(staff_id),min(chair_id) into v_staff,v_chair from public.salon_booking_services
 where business_id=v_business and booking_id=v_booking;
 if exists(select 1 from public.salon_booking_services sl
  join public.salon_bookings b on b.business_id=sl.business_id and b.id=sl.booking_id
  where sl.business_id=v_business and sl.booking_id<>v_booking and
   b.status not in ('cancelled','no_show') and
   (sl.staff_id=v_staff or sl.chair_id=v_chair) and
   sl.starts_at<v_e.proposed_end and sl.ends_at>v_e.proposed_start) then
  raise exception 'Earlier appointment slot no longer available' using errcode='23P01';end if;
 if exists(select 1 from public.salon_early_offers other
   join public.salon_booking_services sl on sl.business_id=other.business_id and sl.booking_id=other.booking_id
   where other.business_id=v_business and other.id<>v_e.id and
    other.status='pending' and other.expires_at>now() and
    (sl.staff_id=v_staff or sl.chair_id=v_chair) and
    other.proposed_start<v_e.proposed_end and other.proposed_end>v_e.proposed_start) then
  raise exception 'Earlier slot held by another customer' using errcode='23P01';end if;
 v_delta:=v_e.proposed_start-v_b.starts_at;
 update public.salon_booking_services set starts_at=starts_at+v_delta,ends_at=ends_at+v_delta
 where business_id=v_business and booking_id=v_booking;
 update public.salon_bookings set starts_at=v_e.proposed_start,ends_at=v_e.proposed_end,
 updated_at=now() where business_id=v_business and id=v_booking;
 update public.salon_early_offers set status='accepted',decided_at=now() where id=v_e.id;
 return pg_catalog.jsonb_build_object('status','accepted','new_start',v_e.proposed_start,
 'booking_id',v_booking,'customer_accepted',true);
end;
$$;
revoke all on function public.beger_g56_respond_early_offer(text,uuid,boolean)
 from public,anon,authenticated;
grant execute on function public.beger_g56_respond_early_offer(text,uuid,boolean) to anon,authenticated;
