-- Beger G4 staging: merchant-recorded collection status and auditable payments.
-- This is not a payment gateway or a legally valid fiscal receipt.
alter table public.g3_orders add column if not exists payment_status text not null default 'unpaid'
 check (payment_status in ('unpaid','paid'));
alter table public.g3_orders add column if not exists payment_method text;
alter table public.g3_orders add column if not exists paid_at timestamptz;
alter table public.g3_orders add column if not exists paid_by uuid;
alter table public.g3_orders add constraint g3_payment_consistency_check
 check ((payment_status='unpaid' and payment_method is null and paid_at is null and paid_by is null)
 or (payment_status='paid' and payment_method in ('cash','external_card','external_transfer') and paid_at is not null and paid_by is not null));

create table if not exists public.g3_payment_events(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.g3_orders(id) on delete cascade,
 status text not null check(status='paid'),
 method text not null check(method in ('cash','external_card','external_transfer')),
 actor_id uuid not null,
 created_at timestamptz not null default now()
);
create unique index if not exists g3_payment_events_one_paid_per_order on public.g3_payment_events(order_id);
alter table public.g3_payment_events enable row level security;
revoke all on public.g3_payment_events from public,anon,authenticated;

-- An authorized business owner/manager records an *already received* external payment.
-- Never create a card charge or claim independent verification of a bank transaction.
create or replace function public.g3_record_external_payment(p_order uuid,p_method text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_method not in ('cash','external_card','external_transfer') or p_method is null then
  raise exception 'Invalid payment method' using errcode='22023';
 end if;
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not exists(select 1 from public.memberships m
 where m.business_id=v_order.business_id and m.user_id=auth.uid() and m.role in ('owner','manager')) then
  raise exception 'Not authorized for collection' using errcode='42501';
 end if;
 if v_order.status='rejected' then raise exception 'Rejected order cannot be marked paid' using errcode='22023';end if;
 if v_order.payment_status='paid' then
  if v_order.payment_method<>p_method then raise exception 'Payment already recorded with another method' using errcode='22023';end if;
  return jsonb_build_object('id',v_order.id,'paymentStatus','paid','method',v_order.payment_method,'alreadyRecorded',true);
 end if;
 update public.g3_orders set payment_status='paid',payment_method=p_method,paid_at=now(),paid_by=auth.uid(),updated_at=now() where id=p_order;
 insert into public.g3_payment_events(order_id,status,method,actor_id) values(p_order,'paid',p_method,auth.uid());
 return jsonb_build_object('id',p_order,'paymentStatus','paid','method',p_method,'alreadyRecorded',false);
end $$;
revoke all on function public.g3_record_external_payment(uuid,text) from public,anon;
grant execute on function public.g3_record_external_payment(uuid,text) to authenticated;

-- Limited queue: current orders + payment facts, scoped to merchant membership.
create or replace function public.g3_branch_orders(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid; v_orders jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or not exists(select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')) then
  raise exception 'Not authorized for branch orders' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',o.id,'table',o.table_label,'serviceMode',o.service_mode,
  'status',o.status,'paymentStatus',o.payment_status,'paymentMethod',o.payment_method,
  'totalMinor',o.total_minor,'currency',o.currency,'createdAt',o.created_at,
  'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections) order by i.id) from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)
 ) order by o.created_at desc),'[]'::jsonb) into v_orders
 from (select * from public.g3_orders where branch_id=p_branch and status not in ('fulfilled','rejected') order by created_at desc limit 100) o;
 return v_orders;
end $$;
revoke all on function public.g3_branch_orders(uuid) from public,anon;
grant execute on function public.g3_branch_orders(uuid) to authenticated;

-- Public-token holder only sees payment status, never method, staff ID, or payment events.
create or replace function public.g3_public_order_status(p_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'status',o.status,'paymentStatus',o.payment_status,
  'reference',upper(substr(replace(o.id::text,'-',''),1,10)),
  'serviceMode',o.service_mode,'table',o.table_label,'currency',o.currency,
  'totalMinor',o.total_minor,'createdAt',o.created_at,
  'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections,'totalMinor',i.line_total_minor) order by i.id) from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)
 ) from public.g3_orders o where o.public_token=p_token
$$;
revoke all on function public.g3_public_order_status(uuid) from public;
grant execute on function public.g3_public_order_status(uuid) to anon,authenticated;
