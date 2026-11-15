-- G53 optional arrival intent: public QR request, staff must verify in the shop.
-- A visit scan is NOT proof of presence; only an authenticated assigned worker/owner can confirm arrived status.
alter table public.salon_bookings add column if not exists arrival_requested_at timestamptz;
create or replace function public.beger_g47_salon_workspace(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_actor uuid := (select auth.uid());
 v_role text;
 v_staff_ids uuid[];
 v_staff jsonb;
 v_bookings jsonb;
 v_stats jsonb;
begin
 if v_actor is null or p_business is null then
  raise exception 'Salon workspace authorization required' using errcode='42501';
 end if;
 select m.role into v_role from public.memberships m
 where m.business_id=p_business and m.user_id=v_actor and m.role in ('owner','manager','staff')
 limit 1;
 if v_role is null then
  raise exception 'Salon workspace authorization required' using errcode='42501';
 end if;
 -- A normal employee must have an explicit active staff identity in this business.
 select coalesce(pg_catalog.array_agg(s.id),array[]::uuid[]) into v_staff_ids
 from public.salon_staff s
 where s.business_id=p_business and s.user_id=v_actor and s.active;
 if v_role='staff' and pg_catalog.cardinality(v_staff_ids)=0 then
  raise exception 'No assigned active salon staff profile' using errcode='42501';
 end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',s.id,'display_name',s.display_name,'kind',s.kind,
    'branch_id',s.branch_id,'accepts_bookings',s.accepts_bookings,
    'start_local',s.start_local,'end_local',s.end_local
 ) order by s.display_name), '[]'::jsonb) into v_staff
 from public.salon_staff s
 where s.business_id=p_business and s.active
  and (v_role in ('owner','manager') or s.id=any(v_staff_ids));
 with visible as (
  select b.id,b.business_id,b.branch_id,b.customer_name,b.status,b.starts_at,b.ends_at,
         b.total_minor,b.collected_minor,b.currency,b.source,b.arrival_requested_at
  from public.salon_bookings b
  where b.business_id=p_business and
    (v_role in ('owner','manager') or exists(
      select 1 from public.salon_booking_services sl
      where sl.business_id=b.business_id and sl.booking_id=b.id
        and sl.staff_id=any(v_staff_ids)))
  order by b.starts_at desc,b.id desc limit 100
 ),
 enriched as (
  select v.*,coalesce((
   select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'service_id',sl.service_id,'staff_id',sl.staff_id,'chair_id',sl.chair_id,
     'line_number',sl.line_number,'duration_minutes',sl.duration_minutes,
     'price_minor',sl.price_minor) order by sl.line_number)
   from public.salon_booking_services sl
   where sl.business_id=v.business_id and sl.booking_id=v.id
     and (v_role in ('owner','manager') or sl.staff_id=any(v_staff_ids))
  ),'[]'::jsonb) as lines
  from visible v
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',e.id,'branch_id',e.branch_id,'customer_name',e.customer_name,
   'status',e.status,'starts_at',e.starts_at,'ends_at',e.ends_at,
   'currency',e.currency,'service_lines',e.lines,
   'total_minor',case when v_role in ('owner','manager') then e.total_minor else null end,
   'collected_minor',case when v_role in ('owner','manager') then e.collected_minor else null end,
   'source',case when v_role in ('owner','manager') then e.source else null end,
   'arrival_requested_at',e.arrival_requested_at)
  order by e.starts_at desc,e.id desc),'[]'::jsonb) into v_bookings
 from enriched e;
 -- Staff-specific financial figures are calculated only from their own settled
 -- service lines. A booking is settled only if fully collected and completed.
 select pg_catalog.jsonb_build_object(
  'assigned_bookings',count(distinct b.id),
  'pending_bookings',count(distinct b.id) filter(where b.status='pending'),
  'completed_bookings',count(distinct b.id) filter(where b.status='completed'),
  'settled_service_minor',coalesce(sum(
    case when b.status='completed' and b.total_minor>0 and b.collected_minor=b.total_minor
      then sl.price_minor else 0 end),0))
 into v_stats
 from public.salon_bookings b
 join public.salon_booking_services sl on sl.business_id=b.business_id and sl.booking_id=b.id
 where b.business_id=p_business
  and (v_role in ('owner','manager') or sl.staff_id=any(v_staff_ids));
 return pg_catalog.jsonb_build_object(
  'business_id',p_business,'scope',case when v_role='staff' then 'assigned_staff' else 'whole_business' end,
  'role',v_role,'staff',v_staff,'bookings',v_bookings,'summary',v_stats,
  'billing_enabled',false,'demo_api',true,'limited_results',100);
end;
$$;

create or replace function public.beger_g53_request_arrival(p_token text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_business uuid;v_booking uuid;v_row public.salon_bookings%rowtype;
begin
 if pg_catalog.char_length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Invalid tracking token' using errcode='42501';end if;
 select business_id,booking_id into v_business,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Invalid booking credential' using errcode='42501';end if;
 select * into v_row from public.salon_bookings where business_id=v_business and id=v_booking for update;
 if not found or v_row.status<>'confirmed' then
  raise exception 'Only confirmed appointments can check in' using errcode='22023';end if;
 if now()<v_row.starts_at-interval '90 minutes' or now()>v_row.ends_at+interval '180 minutes' then
  raise exception 'Arrival must be near scheduled time' using errcode='22023';end if;
 if v_row.arrival_requested_at is not null then
  return pg_catalog.jsonb_build_object('booking_id',v_booking,'status','awaiting_staff_verification',
   'already_requested',true,'physical_presence_verified',false);
 end if;
 update public.salon_bookings set arrival_requested_at=now(),updated_at=now()
 where business_id=v_business and id=v_booking;
 return pg_catalog.jsonb_build_object('booking_id',v_booking,'status','awaiting_staff_verification',
   'already_requested',false,'physical_presence_verified',false);
end;
$$;
revoke all on function public.beger_g53_request_arrival(text) from public,anon,authenticated;
grant execute on function public.beger_g53_request_arrival(text) to anon,authenticated;
