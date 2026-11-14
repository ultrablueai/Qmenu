-- Beger G10: restricted cashier role, isolated from merchant settings and close reports.
create table if not exists public.g10_cashier_staff_branches(
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(branch_id,user_id)
);
alter table public.g10_cashier_staff_branches enable row level security;
revoke all on public.g10_cashier_staff_branches from public,anon,authenticated;
create index if not exists g10_cashier_by_user_idx on public.g10_cashier_staff_branches(user_id);

create or replace function public.g10_cashier_allowed(p_branch uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists(
  select 1 from public.branches b join public.memberships m
    on m.business_id=b.business_id and m.user_id=auth.uid()
  where b.id=p_branch and (m.role in ('owner','manager')
    or (m.role='staff' and exists(
     select 1 from public.g10_cashier_staff_branches c
     where c.branch_id=b.id and c.business_id=b.business_id and c.user_id=auth.uid())))
 )
$$;
revoke all on function public.g10_cashier_allowed(uuid) from public,anon,authenticated;

create or replace function public.g10_cashier_assign(p_branch uuid,p_email text,p_allow boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_user uuid;v_role text;v_email text;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Cashier assignment forbidden' using errcode='42501';end if;
 v_email:=lower(btrim(coalesce(p_email,'')));
 if p_allow is null or char_length(v_email)>254
   or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 then raise exception 'Invalid cashier email' using errcode='22023';end if;
 select id into v_user from auth.users where lower(email)=v_email;
 if v_user is null then raise exception 'User must register first' using errcode='22023';end if;
 select m.role into v_role from public.memberships m
 where m.business_id=v_business and m.user_id=v_user for update;
 if v_role is not null and v_role<>'staff' then
  raise exception 'Cannot change owner or manager membership' using errcode='42501';end if;
 if p_allow then
  insert into public.memberships(business_id,user_id,role)
  values(v_business,v_user,'staff') on conflict(business_id,user_id) do nothing;
  insert into public.g10_cashier_staff_branches(business_id,branch_id,user_id)
  values(v_business,p_branch,v_user) on conflict(branch_id,user_id) do nothing;
 else
  delete from public.g10_cashier_staff_branches
  where business_id=v_business and branch_id=p_branch and user_id=v_user;
 end if;
 return jsonb_build_object('assigned',p_allow);
end $$;
revoke all on function public.g10_cashier_assign(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.g10_cashier_assign(uuid,text,boolean) to authenticated;

create or replace function public.g10_cashier_roster(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Cashier roster forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'since',c.created_at)
 order by c.created_at desc),'[]'::jsonb) into v_result
 from public.g10_cashier_staff_branches c
 join auth.users u on u.id=c.user_id
 join public.memberships m on m.business_id=c.business_id and m.user_id=c.user_id and m.role='staff'
 where c.branch_id=p_branch and c.business_id=v_business;
 return v_result;
end $$;
revoke all on function public.g10_cashier_roster(uuid) from public,anon,authenticated;
grant execute on function public.g10_cashier_roster(uuid) to authenticated;

create or replace function public.g10_my_cashier_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.name),'[]'::jsonb)
 from public.g10_cashier_staff_branches c
 join public.branches b on b.id=c.branch_id and b.business_id=c.business_id
 join public.memberships m on m.business_id=c.business_id and m.user_id=c.user_id and m.role='staff'
 where c.user_id=auth.uid()
$$;
revoke all on function public.g10_my_cashier_branches() from public,anon,authenticated;
grant execute on function public.g10_my_cashier_branches() to authenticated;

-- Only operational fields; no customer token, personal identifiers, staff identity or audit details.
create or replace function public.g10_cashier_queue(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 if not public.g10_cashier_allowed(p_branch) then
  raise exception 'Cashier queue forbidden' using errcode='42501';end if;
 select business_id into v_business from public.branches where id=p_branch;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',o.id,'reference',upper(left(replace(o.id::text,'-',''),10)),
  'table',o.table_label,'status',o.status,'createdAt',o.created_at,
  'paymentStatus',o.payment_status,'paymentMethod',o.payment_method,
  'totalMinor',o.total_minor,'currency',o.currency,
  'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,
     'quantity',i.quantity) order by i.id)
    from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)
 ) order by o.created_at desc),'[]'::jsonb) into v_result
 from (select * from public.g3_orders
  where branch_id=p_branch and business_id=v_business and status<>'rejected'
  and created_at>=now()-interval '24 hours'
  order by created_at desc limit 100) o;
 return v_result;
end $$;
revoke all on function public.g10_cashier_queue(uuid) from public,anon,authenticated;
grant execute on function public.g10_cashier_queue(uuid) to authenticated;

-- Cashier can only accept new orders or confirm pickup; cannot prepare/reject orders.
create or replace function public.g10_cashier_order_action(p_order uuid,p_next text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;
begin
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not public.g10_cashier_allowed(v_order.branch_id) then
  raise exception 'Cashier action forbidden' using errcode='42501';end if;
 if not ((v_order.status='pending' and p_next='accepted')
   or (v_order.status='ready' and p_next='fulfilled'))
 then raise exception 'Invalid cashier order transition' using errcode='22023';end if;
 update public.g3_orders set status=p_next,updated_at=now() where id=p_order;
 return jsonb_build_object('id',p_order,'status',p_next);
end $$;
revoke all on function public.g10_cashier_order_action(uuid,text) from public,anon,authenticated;
grant execute on function public.g10_cashier_order_action(uuid,text) to authenticated;

-- Merchant-recorded external collection only; no charge, reversal or bank confirmation.
create or replace function public.g10_cashier_mark_collected(p_order uuid,p_method text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;
begin
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not public.g10_cashier_allowed(v_order.branch_id) then
  raise exception 'Cashier collection forbidden' using errcode='42501';end if;
 if p_method not in ('cash','external_card','external_transfer') or p_method is null
 then raise exception 'Invalid collection method' using errcode='22023';end if;
 if v_order.status='rejected' then
  raise exception 'Rejected order cannot be collected' using errcode='22023';end if;
 if v_order.payment_status='paid' then
  if v_order.payment_method<>p_method then
   raise exception 'Already collected using another method' using errcode='22023';end if;
  return jsonb_build_object('id',p_order,'method',p_method,'alreadyRecorded',true);
 end if;
 update public.g3_orders set payment_status='paid',payment_method=p_method,
  paid_at=now(),paid_by=auth.uid(),updated_at=now() where id=p_order;
 insert into public.g3_payment_events(order_id,status,method,actor_id)
 values(p_order,'paid',p_method,auth.uid());
 return jsonb_build_object('id',p_order,'method',p_method,'alreadyRecorded',false);
end $$;
revoke all on function public.g10_cashier_mark_collected(uuid,text) from public,anon,authenticated;
grant execute on function public.g10_cashier_mark_collected(uuid,text) to authenticated;
