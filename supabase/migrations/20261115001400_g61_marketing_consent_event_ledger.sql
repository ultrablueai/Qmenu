-- G61: auditable, opt-in marketing permission for future salon promotional Web Push.
-- Transactional booking alerts are independent of marketing preferences.
-- No marketing messages are sent in this release.
create table if not exists public.salon_marketing_consent_events (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 booking_id uuid not null,
 channel text not null default 'push' check(channel='push'),
 purpose text not null default 'promotions' check(purpose='promotions'),
 granted boolean not null,
 notice_version text not null check(length(notice_version) between 6 and 64),
 source text not null default 'customer_booking_page' check(source='customer_booking_page'),
 created_at timestamptz not null default now(),
 foreign key(business_id,booking_id) references public.salon_bookings(business_id,id) on delete cascade
);
create index if not exists salon_marketing_consent_lookup
 on public.salon_marketing_consent_events(business_id,booking_id,created_at desc,id desc);
alter table public.salon_marketing_consent_events enable row level security;
revoke all on public.salon_marketing_consent_events from public,anon,authenticated;

create or replace function public.beger_g61_marketing_status(p_token text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_booking uuid;v_business uuid;v_record public.salon_marketing_consent_events%rowtype;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'Valid booking token required' using errcode='42501';end if;
 select business_id,booking_id into v_business,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Booking credential not found' using errcode='42501';end if;
 select * into v_record from public.salon_marketing_consent_events
 where business_id=v_business and booking_id=v_booking
 order by created_at desc,id desc limit 1;
 return pg_catalog.jsonb_build_object('granted',coalesce(v_record.granted,false),
  'channel','push','purpose','promotions','notice_version',coalesce(v_record.notice_version,'salon-marketing-v1'),
  'last_changed',v_record.created_at,'active_marketing_delivery',false,
  'transactional_booking_notifications_independent',true);
end;
$$;
revoke all on function public.beger_g61_marketing_status(text) from public,anon,authenticated;
grant execute on function public.beger_g61_marketing_status(text) to anon,authenticated;

create or replace function public.beger_g61_marketing_consent(p_token text,p_granted boolean)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare v_booking uuid;v_business uuid;
begin
 if length(coalesce(p_token,''))<>64 or p_token !~ '^[0-9a-f]{64}$' or p_granted is null then
  raise exception 'Valid booking token and consent choice required' using errcode='42501';end if;
 select business_id,booking_id into v_business,v_booking from public.salon_customer_access
 where access_hash=pg_catalog.md5(p_token);
 if v_booking is null then raise exception 'Booking credential not found' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_booking::text,6100));
 insert into public.salon_marketing_consent_events
  (business_id,booking_id,channel,purpose,granted,notice_version,source)
 values(v_business,v_booking,'push','promotions',p_granted,
 'salon-marketing-v1','customer_booking_page');
 return pg_catalog.jsonb_build_object('granted',p_granted,
 'marketing_push_currently_enabled',false,'recorded',true,
 'transactional_alerts_unchanged',true);
end;
$$;
revoke all on function public.beger_g61_marketing_consent(text,boolean) from public,anon,authenticated;
grant execute on function public.beger_g61_marketing_consent(text,boolean) to anon,authenticated;
