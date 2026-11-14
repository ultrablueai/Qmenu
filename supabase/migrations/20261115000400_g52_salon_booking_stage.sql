-- G52: server-authorized state transitions, arrival confirmation and owner link recovery.
create or replace function public.beger_g52_owner_link_status(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_row public.salon_public_links%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.memberships m
   where m.business_id=p_business and m.user_id=v_actor and m.role='owner') then
  raise exception 'Salon owner membership required' using errcode='42501';end if;
 select * into v_row from public.salon_public_links where business_id=p_business;
 if not found then return pg_catalog.jsonb_build_object('configured',false);end if;
 return pg_catalog.jsonb_build_object('configured',true,'slug',v_row.slug,
  'published',v_row.published,'public_booking_enabled',v_row.public_booking_enabled);
end;
$$;
revoke all on function public.beger_g52_owner_link_status(uuid) from public,anon,authenticated;
grant execute on function public.beger_g52_owner_link_status(uuid) to authenticated;

create or replace function public.beger_g52_salon_booking_stage(
 p_business uuid,p_booking uuid,p_next text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_b public.salon_bookings%rowtype;
 v_assignment integer;v_all integer;v_owned integer;v_event text;
begin
 if v_actor is null or p_business is null or p_booking is null then
  raise exception 'Authenticated appointment action required' using errcode='42501';end if;
 select role into v_role from public.memberships
 where business_id=p_business and user_id=v_actor and role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'No salon permission' using errcode='42501';end if;
 if p_next is null or p_next not in ('arrived','in_service','completed','cancelled','no_show') then
  raise exception 'Unsupported appointment action' using errcode='22023';end if;
 select * into v_b from public.salon_bookings where id=p_booking and business_id=p_business for update;
 if not found then raise exception 'Booking not found' using errcode='22023';end if;
 if not (
  (v_b.status='pending' and p_next='cancelled') or
  (v_b.status='confirmed' and p_next in ('arrived','cancelled','no_show')) or
  (v_b.status='arrived' and p_next in ('in_service','cancelled')) or
  (v_b.status='in_service' and p_next='completed')
 ) then raise exception 'Invalid booking state transition' using errcode='22023';end if;
 select count(*),count(*) filter(where exists(
  select 1 from public.salon_staff s where s.business_id=z.business_id
   and s.id=z.staff_id and s.user_id=v_actor and s.active))
 into v_all,v_owned
 from public.salon_booking_services z
 where z.business_id=p_business and z.booking_id=p_booking;
 if v_all=0 then raise exception 'Booking has no assigned services' using errcode='22023';end if;
 if v_role='staff' and v_owned<>v_all then
  raise exception 'Cannot change another worker appointment' using errcode='42501';end if;
 update public.salon_bookings set status=p_next,updated_at=now()
 where business_id=p_business and id=p_booking;
 v_event:=case p_next when 'arrived' then 'arrived' when 'in_service' then 'started'
  when 'completed' then 'completed' when 'cancelled' then 'cancelled' else 'no_show' end;
 insert into public.salon_booking_events(business_id,booking_id,actor_id,event_type)
 values(p_business,p_booking,v_actor,v_event);
 return pg_catalog.jsonb_build_object('booking_id',p_booking,'status',p_next,
   'event_recorded',true,'notifications_queued',false);
end;
$$;
revoke all on function public.beger_g52_salon_booking_stage(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.beger_g52_salon_booking_stage(uuid,uuid,text) to authenticated;
