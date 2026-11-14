-- Beger G57: opt-in web push for short-lived early appointment offers (STAGING only).
-- The public cannot read subscriptions. Only the valid booking bearer token can register a device.
create table if not exists public.salon_push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 booking_id uuid not null,
 endpoint text not null unique,
 p256dh text not null,
 auth_secret text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade,
 constraint salon_push_endpoint_check check(length(endpoint) between 20 and 2048 and endpoint like 'https://%'),
 constraint salon_push_p256dh_check check(length(p256dh) between 80 and 128),
 constraint salon_push_auth_check check(length(auth_secret) between 16 and 48)
);
create index if not exists salon_push_subscriptions_by_booking on public.salon_push_subscriptions(business_id,booking_id);
alter table public.salon_push_subscriptions enable row level security;
revoke all on public.salon_push_subscriptions from public,anon,authenticated;
alter table public.salon_early_offers
 add column if not exists push_claimed_at timestamptz,
 add column if not exists push_sent_at timestamptz;

create or replace function public.beger_g57_register_push(
 p_token text,p_endpoint text,p_p256dh text,p_auth text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_b uuid;v_booking uuid;v_status text;v_count integer;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Valid booking credential required' using errcode='42501';end if;
 select a.business_id,a.booking_id,b.status into v_b,v_booking,v_status
 from public.salon_customer_access a
 join public.salon_bookings b on b.business_id=a.business_id and b.id=a.booking_id
 where a.access_hash=pg_catalog.md5(p_token);
 if v_booking is null or v_status not in ('pending','confirmed','arrived') then
  raise exception 'Booking is not eligible for notifications' using errcode='42501';end if;
 if length(coalesce(p_endpoint,'')) not between 20 and 2048 or p_endpoint not like 'https://%' or
    p_endpoint !~ '^https://[^/[:space:]]+/[^[:space:]]+$' or
    length(coalesce(p_p256dh,'')) not between 80 and 128 or
    p_p256dh !~ '^[A-Za-z0-9_-]+$' or
    length(coalesce(p_auth,'')) not between 16 and 48 or
    p_auth !~ '^[A-Za-z0-9_-]+$' then
  raise exception 'Invalid push subscription' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_booking::text,5700));
 select count(*) into v_count from public.salon_push_subscriptions
 where business_id=v_b and booking_id=v_booking and endpoint<>p_endpoint;
 if v_count>=3 then raise exception 'Device subscription limit reached' using errcode='22023';end if;
 insert into public.salon_push_subscriptions(business_id,booking_id,endpoint,p256dh,auth_secret)
 values(v_b,v_booking,p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set
 business_id=excluded.business_id,booking_id=excluded.booking_id,
 p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,updated_at=now();
 return pg_catalog.jsonb_build_object('subscribed',true,'booking_id',v_booking,
  'max_devices',3,'background_delivery_guaranteed',false);
end;
$$;
revoke all on function public.beger_g57_register_push(text,text,text,text) from public,anon,authenticated;
grant execute on function public.beger_g57_register_push(text,text,text,text) to anon,authenticated;

create or replace function public.beger_g57_unregister_push(p_token text,p_endpoint text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_b uuid;v_booking uuid;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
 raise exception 'Booking credential required' using errcode='42501';end if;
 select business_id,booking_id into v_b,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Booking credential not found' using errcode='42501';end if;
 delete from public.salon_push_subscriptions
 where business_id=v_b and booking_id=v_booking and endpoint=p_endpoint;
 return pg_catalog.jsonb_build_object('subscribed',false);
end;
$$;
revoke all on function public.beger_g57_unregister_push(text,text) from public,anon,authenticated;
grant execute on function public.beger_g57_unregister_push(text,text) to anon,authenticated;

create or replace function public.beger_g57_claim_offer_push(p_business uuid,p_offer uuid)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_e public.salon_early_offers%rowtype;v_slug text;v_dest jsonb;
begin
 if v_actor is null then raise exception 'Worker authentication required' using errcode='42501';end if;
 select role into v_role from public.memberships
 where business_id=p_business and user_id=v_actor and role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Worker permission denied' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_business::text,4818));
 select * into v_e from public.salon_early_offers
 where business_id=p_business and id=p_offer for update;
 if not found or v_e.status<>'pending' or v_e.expires_at<=now() then
  raise exception 'No active offer available' using errcode='22023';end if;
 if v_role='staff' and not exists(
  select 1 from public.salon_booking_services z
  join public.salon_staff st on st.business_id=z.business_id and st.id=z.staff_id
  where z.business_id=p_business and z.booking_id=v_e.booking_id
  group by z.booking_id
  having count(*)=count(*) filter(where st.user_id=v_actor and st.active)
 ) then raise exception 'Offer not assigned to this worker' using errcode='42501';end if;
 if v_e.push_sent_at is not null then
  return pg_catalog.jsonb_build_object('already_sent',true,'devices','[]'::jsonb);end if;
 if v_e.push_claimed_at is not null and v_e.push_claimed_at>now()-interval '75 seconds' then
  return pg_catalog.jsonb_build_object('claim_in_progress',true,'devices','[]'::jsonb);end if;
 update public.salon_early_offers set push_claimed_at=now() where id=p_offer and business_id=p_business;
 select slug into v_slug from public.salon_public_links where business_id=p_business;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_secret)),'[]'::jsonb) into v_dest
 from public.salon_push_subscriptions s
 where s.business_id=p_business and s.booking_id=v_e.booking_id;
 return pg_catalog.jsonb_build_object('already_sent',false,'devices',v_dest,
  'slug',v_slug,'expires_at',v_e.expires_at);
end;
$$;
revoke all on function public.beger_g57_claim_offer_push(uuid,uuid) from public,anon,authenticated;
grant execute on function public.beger_g57_claim_offer_push(uuid,uuid) to authenticated;

create or replace function public.beger_g57_finish_offer_push(p_business uuid,p_offer uuid,p_success boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;
begin
 if v_actor is null or p_success is null then
  raise exception 'Authenticated notification result required' using errcode='42501';end if;
 select role into v_role from public.memberships where business_id=p_business
 and user_id=v_actor and role in ('owner','manager','staff') limit 1;
 if v_role is null or (v_role='staff' and not exists(
   select 1 from public.salon_early_offers e
   join public.salon_booking_services z on z.business_id=e.business_id and z.booking_id=e.booking_id
   join public.salon_staff st on st.business_id=z.business_id and st.id=z.staff_id
   where e.business_id=p_business and e.id=p_offer and st.user_id=v_actor and st.active
 )) then raise exception 'Worker cannot acknowledge unrelated notification' using errcode='42501';end if;
 update public.salon_early_offers
 set push_sent_at=case when p_success then now() else null end,
 push_claimed_at=case when p_success then push_claimed_at else null end
 where business_id=p_business and id=p_offer and status='pending';
 return pg_catalog.jsonb_build_object('acknowledged',true,'delivery_attempted',p_success);
end;
$$;
revoke all on function public.beger_g57_finish_offer_push(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.beger_g57_finish_offer_push(uuid,uuid,boolean) to authenticated;
