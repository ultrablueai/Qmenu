-- G54: Staff contract & manual receipt accounting on Staging only.
-- No payment capture, no payouts, no tax invoice, no salary payments.
create or replace function public.beger_g54_set_staff_agreement(
 p_business uuid,p_staff uuid,p_model text,p_commission_bps integer,
 p_chair_rent_minor bigint,p_rent_period text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_id uuid;
begin
 if v_actor is null or p_business is null or not exists(
  select 1 from public.memberships m where m.business_id=p_business and m.user_id=v_actor and m.role='owner') then
   raise exception 'Only salon owner manages staff agreements' using errcode='42501';end if;
 if not exists(select 1 from public.salon_staff where business_id=p_business and id=p_staff and active) then
   raise exception 'Worker is not in this salon' using errcode='22023';end if;
 if p_model not in ('owner','commission','chair_rent','salary_plus_commission') or
   p_commission_bps is null or p_commission_bps not between 0 and 10000 or
   p_chair_rent_minor is null or p_chair_rent_minor<0 or
   (p_model='chair_rent' and p_rent_period not in ('day','week','month')) then
  raise exception 'Invalid contract details' using errcode='22023';end if;
 -- Contract updates must never rewrite past settled work. Effective from next local date.
 insert into public.salon_staff_contracts(business_id,staff_id,model,commission_bps,chair_rent_minor,rent_period,effective_from)
 values(p_business,p_staff,p_model,p_commission_bps,p_chair_rent_minor,
  case when p_model='chair_rent' then p_rent_period else null end,
  ((now() at time zone 'Europe/Istanbul')::date+1))
 on conflict(business_id,staff_id,effective_from)
 do update set model=excluded.model,commission_bps=excluded.commission_bps,
  chair_rent_minor=excluded.chair_rent_minor,rent_period=excluded.rent_period
 returning id into v_id;
 return pg_catalog.jsonb_build_object('agreement_id',v_id,'staff_id',p_staff,
  'effective_from',((now() at time zone 'Europe/Istanbul')::date+1),
  'model',p_model,'commission_bps',p_commission_bps,
  'chair_rent_minor',p_chair_rent_minor,'rent_period',p_rent_period,
  'payouts_enabled',false,'manual_cash_only',true);
end;
$$;
revoke all on function public.beger_g54_set_staff_agreement(uuid,uuid,text,integer,bigint,text) from public,anon,authenticated;
grant execute on function public.beger_g54_set_staff_agreement(uuid,uuid,text,integer,bigint,text) to authenticated;

create or replace function public.beger_g54_record_manual_collection(p_business uuid,p_booking uuid)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_b public.salon_bookings%rowtype;v_unconfigured integer;
begin
 if v_actor is null or not exists(select 1 from public.memberships m where
    m.business_id=p_business and m.user_id=v_actor and m.role in ('owner','manager')) then
   raise exception 'Cashier permission required' using errcode='42501';end if;
 select * into v_b from public.salon_bookings where business_id=p_business and id=p_booking for update;
 if not found or v_b.status<>'completed' or v_b.total_minor<=0 or v_b.collected_minor<>0 then
   raise exception 'Only unpaid completed bookings may be recorded' using errcode='22023';end if;
 -- Avoid presenting a false staff profit when shares were never configured.
 select count(*) into v_unconfigured from public.salon_booking_services s
 where s.business_id=p_business and s.booking_id=p_booking
 and not exists(select 1 from public.salon_staff_contracts c
   where c.business_id=p_business and c.staff_id=s.staff_id
    and c.effective_from<=(v_b.starts_at at time zone 'Europe/Istanbul')::date);
 if v_unconfigured>0 then raise exception 'Staff agreement required before closing receipt' using errcode='22023';end if;
 update public.salon_bookings set collected_minor=v_b.total_minor,updated_at=now()
 where business_id=p_business and id=p_booking and collected_minor=0;
 insert into public.salon_booking_events(business_id,booking_id,actor_id,event_type)
 values(p_business,p_booking,v_actor,'collected');
 return pg_catalog.jsonb_build_object('booking_id',p_booking,'status','recorded_manual_collection',
  'collected_minor',v_b.total_minor,'currency',v_b.currency,
  'audit_recorded',true,'payment_provider_charged',false,'payout_executed',false);
end;
$$;
revoke all on function public.beger_g54_record_manual_collection(uuid,uuid) from public,anon,authenticated;
grant execute on function public.beger_g54_record_manual_collection(uuid,uuid) to authenticated;

create or replace function public.beger_g54_staff_finance(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_role text;v_data jsonb;v_total bigint;
begin
 if v_actor is null then raise exception 'Authenticated finance membership required' using errcode='42501';end if;
 select m.role into v_role from public.memberships m where m.business_id=p_business
  and m.user_id=v_actor and m.role in ('owner','manager','staff') limit 1;
 if v_role is null then raise exception 'Finance access forbidden' using errcode='42501';end if;
 if v_role='staff' and not exists(select 1 from public.salon_staff s
    where s.business_id=p_business and s.user_id=v_actor and s.active) then
   raise exception 'No active assigned salon profile' using errcode='42501';end if;
 with settled_lines as (
  select s.staff_id,s.price_minor,b.starts_at,b.id as booking_id
  from public.salon_booking_services s
  join public.salon_bookings b on b.business_id=s.business_id and b.id=s.booking_id
  where s.business_id=p_business and b.status='completed' and b.total_minor>0
    and b.collected_minor=b.total_minor and
    (v_role in ('owner','manager') or exists(select 1 from public.salon_staff st
       where st.id=s.staff_id and st.business_id=p_business and st.user_id=v_actor and st.active))
 ), split as (
  select l.*,c.model,c.commission_bps,
    case when c.model='chair_rent' then l.price_minor
      when c.model='owner' then 0
      else ((l.price_minor*c.commission_bps+5000)/10000)::bigint end as worker_minor
  from settled_lines l
  left join lateral(select z.model,z.commission_bps from public.salon_staff_contracts z
    where z.business_id=p_business and z.staff_id=l.staff_id
    and z.effective_from<=(l.starts_at at time zone 'Europe/Istanbul')::date
    order by z.effective_from desc limit 1) c on true
 ), per_staff as (
  select st.id,st.display_name,count(distinct s.booking_id) as bookings,
    coalesce(sum(s.price_minor),0) as sales_minor,
    coalesce(sum(s.worker_minor),0) as worker_minor,
    coalesce(sum(s.price_minor-s.worker_minor),0) as shop_minor,
    count(*) filter(where s.model is null) as unconfigured_lines
  from public.salon_staff st left join split s on s.staff_id=st.id
  where st.business_id=p_business and (v_role in ('owner','manager') or st.user_id=v_actor and st.active)
  group by st.id,st.display_name
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'staff_id',id,'name',display_name,'bookings',bookings,
   'sales_minor',sales_minor,'worker_minor',worker_minor,
   'shop_minor',shop_minor,'unconfigured_lines',unconfigured_lines) order by display_name),'[]'::jsonb)
 into v_data from per_staff;
 return pg_catalog.jsonb_build_object('business_id',p_business,
  'scope',case when v_role='staff' then 'own_only' else 'whole_business' end,
  'staff',v_data,'collected_only',true,'external_payouts_enabled',false,
  'chair_rent_billed',false,'salaries_included',false,'tax_invoice_issued',false);
end;
$$;
revoke all on function public.beger_g54_staff_finance(uuid) from public,anon,authenticated;
grant execute on function public.beger_g54_staff_finance(uuid) to authenticated;
