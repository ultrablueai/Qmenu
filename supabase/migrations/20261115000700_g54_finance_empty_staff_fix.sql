-- Prevent empty workers from appearing with unconfigured earnings.
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
    count(*) filter(where s.price_minor is not null and s.model is null) as unconfigured_lines
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
