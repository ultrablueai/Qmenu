-- Beger G3 staged real table orders; no production deployment and OFF by default.
create table if not exists public.g3_branch_order_settings(
 branch_id uuid primary key references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.g3_orders(
 id uuid primary key default gen_random_uuid(),
 public_token uuid not null unique default gen_random_uuid(),
 request_id uuid not null,
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 table_id uuid not null references public.dining_tables(id),
 table_label text not null,
 currency text not null,
 status text not null default 'pending' check (status in ('pending','accepted','preparing','ready','fulfilled','rejected')),
 total_minor bigint not null default 0 check(total_minor>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(table_id,request_id)
);
create index if not exists g3_orders_branch_status_idx on public.g3_orders(branch_id,status,created_at desc);
create index if not exists g3_orders_table_created_idx on public.g3_orders(table_id,created_at desc);
create table if not exists public.g3_order_items(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.g3_orders(id) on delete cascade,
 product_id uuid not null references public.catalog_products(id),
 product_name_ar text not null,
 product_name_tr text not null,
 quantity integer not null check(quantity between 1 and 20),
 base_minor bigint not null,
 extras_minor bigint not null,
 line_total_minor bigint not null,
 selections jsonb not null default '[]'::jsonb
);
create table if not exists public.g3_order_events(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.g3_orders(id) on delete cascade,
 old_status text,
 new_status text not null,
 actor_id uuid,
 created_at timestamptz not null default now()
);
alter table public.g3_branch_order_settings enable row level security;
alter table public.g3_orders enable row level security;
alter table public.g3_order_items enable row level security;
alter table public.g3_order_events enable row level security;
revoke all on public.g3_branch_order_settings,public.g3_orders,public.g3_order_items,public.g3_order_events from public,anon,authenticated;
-- Only owner/manager may change branch pilot status. Other queries use constrained RPCs.
create policy "g3_settings_owner_manager_select" on public.g3_branch_order_settings
 for select to authenticated using (exists(select 1 from public.memberships m where m.business_id=g3_branch_order_settings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "g3_settings_owner_manager_insert" on public.g3_branch_order_settings
 for insert to authenticated with check (exists(select 1 from public.memberships m where m.business_id=g3_branch_order_settings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) and exists(select 1 from public.branches b where b.id=branch_id and b.business_id=business_id));
create policy "g3_settings_owner_manager_update" on public.g3_branch_order_settings
 for update to authenticated using (exists(select 1 from public.memberships m where m.business_id=g3_branch_order_settings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
 with check (exists(select 1 from public.memberships m where m.business_id=g3_branch_order_settings.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
grant select,insert,update on public.g3_branch_order_settings to authenticated;

create or replace function public.g3_submit_table_order(p_table_token uuid,p_request_id uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_table record; v_order uuid; v_public uuid; v_line jsonb; v_product uuid; v_qty integer;
 v_prod record; v_group record; v_ids uuid[]; v_known integer; v_selected integer;
 v_options jsonb; v_extra bigint; v_total bigint:=0; v_line_total bigint; v_currency text;
 v_omissions jsonb; v_name text; v_item_count integer;
begin
 select t.id,t.branch_id,t.business_id,t.label,b.country_code into v_table
 from public.dining_tables t join public.branches br on br.id=t.branch_id and br.business_id=t.business_id
 join public.businesses b on b.id=t.business_id
 where t.qr_token=p_table_token and t.active=true;
 if not found then raise exception 'Table QR is inactive or invalid' using errcode='22023';end if;
 if not exists(select 1 from public.g3_branch_order_settings s where s.branch_id=v_table.branch_id and s.business_id=v_table.business_id and s.enabled) then
 raise exception 'Table orders not enabled for this branch' using errcode='42501';end if;
 if p_request_id is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid order request' using errcode='22023';end if;
 v_item_count:=jsonb_array_length(p_items);
 if v_item_count<1 or v_item_count>20 then raise exception 'Order must contain 1–20 distinct lines' using errcode='22023';end if;
 select o.id,o.public_token into v_order,v_public from public.g3_orders o where o.table_id=v_table.id and o.request_id=p_request_id;
 if found then return jsonb_build_object('id',v_order,'token',v_public,'status','pending','duplicate',true);end if;
 if (select count(*) from public.g3_orders where table_id=v_table.id and created_at>now()-interval '1 minute')>=4 then
 raise exception 'Too many recent requests for this table' using errcode='42501';end if;
 v_currency:=case when v_table.country_code='TR' then 'TRY' when v_table.country_code='SY' then 'SYP' else v_table.country_code end;
 insert into public.g3_orders(request_id,business_id,branch_id,table_id,table_label,currency)
 values(p_request_id,v_table.business_id,v_table.branch_id,v_table.id,v_table.label,v_currency)
 returning id,public_token into v_order,v_public;
 for v_line in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_line) is distinct from 'object' then raise exception 'Invalid order line' using errcode='22023';end if;
  v_product:=(v_line->>'productId')::uuid;
  v_qty:=(v_line->>'quantity')::integer;
  if v_qty is null or v_qty<1 or v_qty>20 then raise exception 'Invalid quantity' using errcode='22023';end if;
  if jsonb_typeof(coalesce(v_line->'optionIds','[]'::jsonb)) <> 'array' then raise exception 'Invalid options' using errcode='22023';end if;
  if jsonb_array_length(coalesce(v_line->'optionIds','[]'::jsonb))>30 then raise exception 'Too many options' using errcode='22023';end if;
  select coalesce(array_agg(v.value::uuid),'{}'::uuid[]) into v_ids
   from jsonb_array_elements_text(coalesce(v_line->'optionIds','[]'::jsonb)) as v(value);
  if cardinality(v_ids)<>(select count(distinct id) from unnest(v_ids) as id) then raise exception 'Repeated option ID' using errcode='22023';end if;
  select p.name_ar,p.name_tr,coalesce(pub.price_override_minor,p.price_minor) as price into v_prod
  from public.catalog_products p
  join public.catalog_categories cat on cat.id=p.category_id and cat.active
  join public.catalog_branch_publications pub on pub.product_id=p.id and pub.branch_id=v_table.branch_id and pub.business_id=v_table.business_id
  where p.id=v_product and p.business_id=v_table.business_id and p.active=true and pub.active=true and pub.available=true;
  if not found then raise exception 'Product is not published or available' using errcode='22023';end if;
  for v_group in select id,min_select,max_select from public.catalog_modifier_groups where product_id=v_product and business_id=v_table.business_id and active=true loop
    select count(*) into v_selected from public.catalog_modifier_options opt where opt.group_id=v_group.id and opt.business_id=v_table.business_id and opt.active=true and opt.id=any(v_ids);
    if v_selected<v_group.min_select or v_selected>v_group.max_select then raise exception 'Required selections not complete' using errcode='22023';end if;
  end loop;
  select count(*),coalesce(sum(opt.price_delta_minor),0),
   coalesce(jsonb_agg(jsonb_build_object('name_ar',opt.name_ar,'name_tr',opt.name_tr,'price_minor',opt.price_delta_minor)),'[]'::jsonb)
   into v_known,v_extra,v_options
  from public.catalog_modifier_options opt join public.catalog_modifier_groups g on g.id=opt.group_id and g.active=true and g.product_id=v_product
  where opt.business_id=v_table.business_id and opt.active=true and opt.id=any(v_ids);
  if v_known<>cardinality(v_ids) then raise exception 'Unknown or disabled modifier' using errcode='22023';end if;
  if v_prod.price<0 or v_extra<0 then raise exception 'Invalid price' using errcode='22023';end if;
  v_line_total:=(v_prod.price+v_extra)*v_qty;
  v_total:=v_total+v_line_total;
  if v_total>100000000000 then raise exception 'Order total too large' using errcode='22023';end if;
  v_omissions:=coalesce(v_line->'removedIngredients','[]'::jsonb);
  if jsonb_typeof(v_omissions)<>'array' or jsonb_array_length(v_omissions)>20 then raise exception 'Invalid ingredients' using errcode='22023';end if;
  for v_name in select jsonb_array_elements_text(v_omissions) loop
   if not exists(select 1 from public.catalog_product_ingredients ci where ci.product_id=v_product and ci.business_id=v_table.business_id and ci.name_ar=v_name and ci.is_optional) then
    raise exception 'Ingredient cannot be removed' using errcode='22023';end if;
  end loop;
  insert into public.g3_order_items(order_id,product_id,product_name_ar,product_name_tr,quantity,base_minor,extras_minor,line_total_minor,selections)
  values(v_order,v_product,v_prod.name_ar,v_prod.name_tr,v_qty,v_prod.price,v_extra,v_line_total,jsonb_build_object('options',v_options,'removedIngredients',v_omissions));
 end loop;
 update public.g3_orders set total_minor=v_total where id=v_order;
 insert into public.g3_order_events(order_id,old_status,new_status) values(v_order,null,'pending');
 return jsonb_build_object('id',v_order,'token',v_public,'status','pending','table',v_table.label,'totalMinor',v_total,'currency',v_currency);
exception when unique_violation then
 select o.id,o.public_token into v_order,v_public from public.g3_orders o where o.table_id=v_table.id and o.request_id=p_request_id;
 if v_order is not null then return jsonb_build_object('id',v_order,'token',v_public,'status','pending','duplicate',true);end if;
 raise;
end $$;
revoke all on function public.g3_submit_table_order(uuid,uuid,jsonb) from public;
grant execute on function public.g3_submit_table_order(uuid,uuid,jsonb) to anon,authenticated;

create or replace function public.g3_public_order_status(p_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object('status',o.status,'table',o.table_label,'currency',o.currency,'totalMinor',o.total_minor,
 'createdAt',o.created_at,'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections,'totalMinor',i.line_total_minor) order by i.id) from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb))
 from public.g3_orders o where o.public_token=p_token
$$;
revoke all on function public.g3_public_order_status(uuid) from public;
grant execute on function public.g3_public_order_status(uuid) to anon,authenticated;

create or replace function public.g3_branch_orders(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid; v_orders jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or not exists(select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')) then
 raise exception 'Not authorized for branch orders' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'table',o.table_label,'status',o.status,'totalMinor',o.total_minor,'currency',o.currency,'createdAt',o.created_at,'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections) order by i.id) from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)) order by o.created_at desc),'[]'::jsonb) into v_orders
 from (select * from public.g3_orders where branch_id=p_branch and status not in ('fulfilled','rejected') order by created_at desc limit 100) o;
 return v_orders;
end $$;
revoke all on function public.g3_branch_orders(uuid) from public,anon;
grant execute on function public.g3_branch_orders(uuid) to authenticated;

create or replace function public.g3_transition_order(p_order uuid,p_next text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not exists(select 1 from public.memberships m where m.business_id=v_order.business_id and m.user_id=auth.uid() and m.role in ('owner','manager')) then
 raise exception 'Not authorized for order' using errcode='42501';end if;
 if v_order.status=p_next then return jsonb_build_object('id',v_order.id,'status',v_order.status);end if;
 if not ((v_order.status='pending' and p_next in ('accepted','rejected'))
 or (v_order.status='accepted' and p_next in ('preparing','rejected'))
 or (v_order.status='preparing' and p_next='ready')
 or (v_order.status='ready' and p_next='fulfilled')) then
 raise exception 'Invalid state transition' using errcode='22023';end if;
 update public.g3_orders set status=p_next,updated_at=now() where id=v_order.id;
 insert into public.g3_order_events(order_id,old_status,new_status,actor_id) values(v_order.id,v_order.status,p_next,auth.uid());
 return jsonb_build_object('id',v_order.id,'status',p_next);
end $$;
revoke all on function public.g3_transition_order(uuid,text) from public,anon;
grant execute on function public.g3_transition_order(uuid,text) to authenticated;

-- Public capability is a boolean only. It does not expose merchant settings.
create or replace function public.g3_table_order_enabled(p_table_token uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.dining_tables t
  join public.g3_branch_order_settings f on f.branch_id=t.branch_id and f.business_id=t.business_id and f.enabled=true
  where t.qr_token=p_table_token and t.active=true
 )
$$;
revoke all on function public.g3_table_order_enabled(uuid) from public;
grant execute on function public.g3_table_order_enabled(uuid) to anon,authenticated;
