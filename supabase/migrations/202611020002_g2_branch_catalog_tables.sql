-- Beger G2: branch-scoped catalog and revocable public table locators.
-- Staging only. No changes to auth/users/production. No fixtures.
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  name_ar text not null check (char_length(trim(name_ar)) between 1 and 100),
  name_tr text not null check (char_length(trim(name_tr)) between 1 and 100),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, branch_id),
  foreign key (branch_id, business_id) references public.branches(id,business_id) on delete cascade
);
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  category_id uuid not null,
  name_ar text not null check (char_length(trim(name_ar)) between 1 and 120),
  name_tr text not null check (char_length(trim(name_tr)) between 1 and 120),
  description_ar text not null default '' check (char_length(description_ar) <= 1000),
  description_tr text not null default '' check (char_length(description_tr) <= 1000),
  price_minor bigint not null check (price_minor >= 0 and price_minor <= 100000000000),
  image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url ~ '^https://[^[:space:]]+$')),
  active boolean not null default true,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (branch_id, business_id) references public.branches(id,business_id) on delete cascade,
  foreign key (category_id, branch_id) references public.menu_categories(id,branch_id) on delete cascade
);
create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 50),
  qr_token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (branch_id,label),
  foreign key (branch_id,business_id) references public.branches(id,business_id) on delete cascade
);
create unique index if not exists g2_branch_business_id_unique on public.branches(id,business_id);
create index if not exists g2_menu_categories_by_branch on public.menu_categories(branch_id,active,sort_order);
create index if not exists g2_menu_items_by_branch on public.menu_items(branch_id,category_id,active,available,sort_order);
create index if not exists g2_tables_by_branch on public.dining_tables(branch_id,active);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.dining_tables enable row level security;

revoke all on public.menu_categories,public.menu_items,public.dining_tables from public,anon,authenticated;
grant select,insert,update,delete on public.menu_categories,public.menu_items,public.dining_tables to authenticated;

create policy g2_categories_manager_select on public.menu_categories for select to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_categories_manager_insert on public.menu_categories for insert to authenticated
with check (exists (select 1 from public.memberships m where m.business_id=menu_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_categories_manager_update on public.menu_categories for update to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.memberships m where m.business_id=menu_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_categories_manager_delete on public.menu_categories for delete to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));

create policy g2_items_manager_select on public.menu_items for select to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_items.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_items_manager_insert on public.menu_items for insert to authenticated
with check (exists (select 1 from public.memberships m where m.business_id=menu_items.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_items_manager_update on public.menu_items for update to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_items.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.memberships m where m.business_id=menu_items.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_items_manager_delete on public.menu_items for delete to authenticated
using (exists (select 1 from public.memberships m where m.business_id=menu_items.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));

create policy g2_tables_manager_select on public.dining_tables for select to authenticated
using (exists (select 1 from public.memberships m where m.business_id=dining_tables.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_tables_manager_insert on public.dining_tables for insert to authenticated
with check (exists (select 1 from public.memberships m where m.business_id=dining_tables.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_tables_manager_update on public.dining_tables for update to authenticated
using (exists (select 1 from public.memberships m where m.business_id=dining_tables.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.memberships m where m.business_id=dining_tables.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_tables_manager_delete on public.dining_tables for delete to authenticated
using (exists (select 1 from public.memberships m where m.business_id=dining_tables.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));

-- Public menu publishes only active categories and available items, not merchant/customer tables.
create or replace function public.public_branch_menu(p_branch uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name_ar',c.name_ar,'name_tr',c.name_tr,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'name_ar',i.name_ar,'name_tr',i.name_tr,
      'description_ar',i.description_ar,'description_tr',i.description_tr,
      'price_minor',i.price_minor,'image_url',i.image_url
    ) order by i.sort_order,i.created_at)
    from public.menu_items i
    where i.branch_id=p_branch and i.category_id=c.id and i.active and i.available),'[]'::jsonb)
  ) order by c.sort_order,c.created_at),'[]'::jsonb)
  from public.menu_categories c
  where c.branch_id=p_branch and c.active
$$;
revoke all on function public.public_branch_menu(uuid) from public,anon,authenticated;
grant execute on function public.public_branch_menu(uuid) to anon,authenticated;

-- Public token is a locator, not proof of on-premise presence or permission to order/pickup.
create or replace function public.public_table_locator(p_token uuid)
returns table(branch_id uuid,branch_name text,business_name text,country_code text,table_label text)
language sql stable security definer set search_path=''
as $$
  select b.id,b.name,v.name,v.country_code,t.label
  from public.dining_tables t join public.branches b on b.id=t.branch_id
  join public.businesses v on v.id=t.business_id
  where t.qr_token=p_token and t.active limit 1
$$;
revoke all on function public.public_table_locator(uuid) from public,anon,authenticated;
grant execute on function public.public_table_locator(uuid) to anon,authenticated;
