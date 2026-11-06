-- Beger sector and capability preference draft; does NOT grant subscription entitlements.
-- Safe additive Staging migration; no historical merchant data overwritten.
create table if not exists public.beger_merchant_model_preferences(
 business_id uuid primary key references public.businesses(id) on delete cascade,
 sector text not null check(sector in ('cafe','restaurant','bakery','barber','salon','clinic','retail')),
 requested_capabilities text[] not null default '{}'::text[],
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 constraint beger_model_features_valid check(
  cardinality(requested_capabilities)<=10
  and array_position(requested_capabilities,null) is null
  and requested_capabilities <@ (
   case sector
    when 'cafe' then array['qr_catalog','table_orders','counter_queue','kitchen_board','scheduled_pickup','digital_pager','customer_loyalty','analytics']
    when 'restaurant' then array['qr_catalog','table_orders','counter_queue','kitchen_board','scheduled_pickup','digital_pager','customer_loyalty','analytics']
    when 'bakery' then array['qr_catalog','counter_queue','kitchen_board','scheduled_pickup','digital_pager','customer_loyalty','analytics']
    when 'barber' then array['qr_catalog','appointments','walkin_queue','digital_pager','customer_loyalty','analytics']
    when 'salon' then array['qr_catalog','appointments','walkin_queue','digital_pager','customer_loyalty','analytics']
    when 'clinic' then array['appointments','walkin_queue','digital_pager','analytics']
    when 'retail' then array['qr_catalog','counter_queue','scheduled_pickup','digital_pager','customer_loyalty','analytics']
   end
  )
 )
);
alter table public.beger_merchant_model_preferences enable row level security;
revoke all on public.beger_merchant_model_preferences from public,anon,authenticated;
grant select,insert,update on public.beger_merchant_model_preferences to authenticated;

create policy beger_model_member_read on public.beger_merchant_model_preferences
 for select to authenticated using(
  exists(select 1 from public.memberships m where m.business_id=beger_merchant_model_preferences.business_id
   and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
 );
create policy beger_model_owner_insert on public.beger_merchant_model_preferences
 for insert to authenticated with check(
  updated_by=(select auth.uid())
  and exists(select 1 from public.memberships m where m.business_id=beger_merchant_model_preferences.business_id
   and m.user_id=(select auth.uid()) and m.role='owner')
 );
create policy beger_model_owner_update on public.beger_merchant_model_preferences
 for update to authenticated using(
  exists(select 1 from public.memberships m where m.business_id=beger_merchant_model_preferences.business_id
   and m.user_id=(select auth.uid()) and m.role='owner')
 ) with check(
  updated_by=(select auth.uid())
  and exists(select 1 from public.memberships m where m.business_id=beger_merchant_model_preferences.business_id
   and m.user_id=(select auth.uid()) and m.role='owner')
 );
comment on table public.beger_merchant_model_preferences is
 'Merchant-requested sector/capabilities draft only. Never infer active entitlement, billable subscription, payment, or permissions from this table.';
