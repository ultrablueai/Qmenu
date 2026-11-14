-- Beger G9: least-privilege kitchen workstation. No payment or merchant-admin access.
create table if not exists public.g9_kitchen_staff_branches(
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(branch_id,user_id)
);
alter table public.g9_kitchen_staff_branches enable row level security;
revoke all on public.g9_kitchen_staff_branches from public,anon,authenticated;
create index if not exists g9_kitchen_staff_user_idx on public.g9_kitchen_staff_branches(user_id);
create table if not exists public.g9_kitchen_events(
 id bigint generated always as identity primary key,
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 order_id uuid not null references public.g3_orders(id),
 actor_id uuid not null references auth.users(id),
 from_status text not null,
 to_status text not null,
 created_at timestamptz not null default now()
);
alter table public.g9_kitchen_events enable row level security;
revoke all on public.g9_kitchen_events from public,anon,authenticated;
create index if not exists g9_kitchen_events_order_idx on public.g9_kitchen_events(order_id,created_at desc);

create or replace function public.g9_kitchen_allowed(p_branch uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists(
  select 1 from public.branches b join public.memberships m
   on m.business_id=b.business_id and m.user_id=auth.uid()
  where b.id=p_branch and (
   m.role in ('owner','manager')
   or (m.role='staff' and exists(
    select 1 from public.g9_kitchen_staff_branches k
    where k.branch_id=b.id and k.business_id=b.business_id and k.user_id=auth.uid()
   ))
  )
 )
$$;
revoke all on function public.g9_kitchen_allowed(uuid) from public,anon,authenticated;

-- Owner assigns only registered accounts, never upgrades manager/owner roles.
create or replace function public.g9_kitchen_assign(p_branch uuid,p_email text,p_allow boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_user uuid;v_role text;v_email text;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Kitchen assignment forbidden' using errcode='42501';end if;
 v_email:=lower(btrim(coalesce(p_email,'')));
 if p_allow is null or char_length(v_email)>254
  or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 then raise exception 'Invalid employee email' using errcode='22023';end if;
 select u.id into v_user from auth.users u where lower(u.email)=v_email;
 if v_user is null then raise exception 'User must register first' using errcode='22023';end if;
 select m.role into v_role from public.memberships m
 where m.business_id=v_business and m.user_id=v_user for update;
 if v_role is not null and v_role<>'staff' then
  raise exception 'Cannot reassign manager or owner' using errcode='42501';end if;
 if p_allow then
  insert into public.memberships(business_id,user_id,role)
  values(v_business,v_user,'staff') on conflict(business_id,user_id) do nothing;
  insert into public.g9_kitchen_staff_branches(business_id,branch_id,user_id)
  values(v_business,p_branch,v_user) on conflict(branch_id,user_id) do nothing;
 else
  delete from public.g9_kitchen_staff_branches
  where business_id=v_business and branch_id=p_branch and user_id=v_user;
 end if;
 return jsonb_build_object('assigned',p_allow);
end $$;
revoke all on function public.g9_kitchen_assign(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.g9_kitchen_assign(uuid,text,boolean) to authenticated;

create or replace function public.g9_kitchen_roster(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Kitchen roster forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'since',k.created_at)
  order by k.created_at desc),'[]'::jsonb)
 into v_result from public.g9_kitchen_staff_branches k
 join auth.users u on u.id=k.user_id
 join public.memberships m on m.user_id=k.user_id and m.business_id=k.business_id and m.role='staff'
 where k.branch_id=p_branch and k.business_id=v_business;
 return v_result;
end $$;
revoke all on function public.g9_kitchen_roster(uuid) from public,anon,authenticated;
grant execute on function public.g9_kitchen_roster(uuid) to authenticated;

create or replace function public.g9_my_kitchen_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name) order by b.name),'[]'::jsonb)
 from public.g9_kitchen_staff_branches k
 join public.branches b on b.id=k.branch_id and b.business_id=k.business_id
 join public.memberships m on m.business_id=k.business_id and m.user_id=k.user_id and m.role='staff'
 where k.user_id=auth.uid()
$$;
revoke all on function public.g9_my_kitchen_branches() from public,anon,authenticated;
grant execute on function public.g9_my_kitchen_branches() to authenticated;

-- Staff never receive payment methods, order totals, guest tokens, or private user data.
create or replace function public.g9_kitchen_queue(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 if not public.g9_kitchen_allowed(p_branch) then
  raise exception 'Kitchen read forbidden' using errcode='42501';end if;
 select business_id into v_business from public.branches where id=p_branch;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',o.id,'reference',upper(left(replace(o.id::text,'-',''),10)),
  'table',o.table_label,'status',o.status,'createdAt',o.created_at,
  'items',coalesce((select jsonb_agg(jsonb_build_object(
    'name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections) order by i.id)
    from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)
 ) order by o.created_at),'[]'::jsonb) into v_result
 from (select * from public.g3_orders
  where branch_id=p_branch and business_id=v_business
  and status in ('accepted','preparing','ready')
  order by created_at limit 100) o;
 return v_result;
end $$;
revoke all on function public.g9_kitchen_queue(uuid) from public,anon,authenticated;
grant execute on function public.g9_kitchen_queue(uuid) to authenticated;

-- Kitchen cannot accept, reject, fulfill orders or record any collection.
create or replace function public.g9_kitchen_advance(p_order uuid,p_next text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not public.g9_kitchen_allowed(v_order.branch_id) then
  raise exception 'Kitchen update forbidden' using errcode='42501';end if;
 if not (
  (v_order.status='accepted' and p_next='preparing')
  or (v_order.status='preparing' and p_next='ready')
 ) then raise exception 'Invalid kitchen transition' using errcode='22023';end if;
 update public.g3_orders set status=p_next,updated_at=now() where id=v_order.id;
 insert into public.g9_kitchen_events(business_id,branch_id,order_id,actor_id,from_status,to_status)
 values(v_order.business_id,v_order.branch_id,v_order.id,auth.uid(),v_order.status,p_next);
 return jsonb_build_object('id',v_order.id,'status',p_next);
end $$;
revoke all on function public.g9_kitchen_advance(uuid,text) from public,anon,authenticated;
grant execute on function public.g9_kitchen_advance(uuid,text) to authenticated;
