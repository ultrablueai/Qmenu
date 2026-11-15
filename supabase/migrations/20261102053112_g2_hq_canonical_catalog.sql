-- Beger G2 HQ catalog v1: additive canonical catalog + explicit branch publications.
-- Old menu_categories/menu_items remain untouched; public guest reads both until verified cutover.
create table public.catalog_categories (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 name_ar text not null check (char_length(trim(name_ar)) between 1 and 100),
 name_tr text not null check (char_length(trim(name_tr)) between 1 and 100),
 sort_order int not null default 0,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (id,business_id)
);
create table public.catalog_products (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 category_id uuid not null,
 name_ar text not null check (char_length(trim(name_ar)) between 1 and 120),
 name_tr text not null check (char_length(trim(name_tr)) between 1 and 120),
 description_ar text not null default '' check (char_length(description_ar) <= 1000),
 description_tr text not null default '' check (char_length(description_tr) <= 1000),
 price_minor bigint not null check (price_minor between 0 and 100000000000),
 image_url text check (image_url is null or (char_length(image_url) <= 2048 and image_url ~ '^https://[^[:space:]]+$')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique (id,business_id),
 foreign key (category_id,business_id) references public.catalog_categories(id,business_id)
);
create table public.catalog_branch_publications (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 branch_id uuid not null,
 product_id uuid not null,
 active boolean not null default true,
 available boolean not null default true,
 sort_order int not null default 0,
 price_override_minor bigint check (price_override_minor between 0 and 100000000000),
 created_at timestamptz not null default now(),
 unique(branch_id,product_id),
 foreign key (branch_id,business_id) references public.branches(id,business_id) on delete cascade,
 foreign key (product_id,business_id) references public.catalog_products(id,business_id) on delete cascade
);
create index on public.catalog_categories(business_id,sort_order);
create index on public.catalog_products(business_id,category_id);
create index on public.catalog_branch_publications(branch_id,active,available);
alter table public.catalog_categories enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_branch_publications enable row level security;
revoke all on public.catalog_categories,public.catalog_products,public.catalog_branch_publications from public,anon,authenticated;
grant select,insert,update,delete on public.catalog_categories,public.catalog_products,public.catalog_branch_publications to authenticated;

-- Explicit HQ membership only; no staff privilege. An RLS check is performed on both original and new row for UPDATE.
create policy g2_hq_categories_all on public.catalog_categories for all to authenticated
 using (exists (select 1 from public.memberships m where m.business_id=catalog_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
 with check (exists (select 1 from public.memberships m where m.business_id=catalog_categories.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_hq_products_all on public.catalog_products for all to authenticated
 using (exists (select 1 from public.memberships m where m.business_id=catalog_products.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
 with check (exists (select 1 from public.memberships m where m.business_id=catalog_products.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy g2_hq_publications_all on public.catalog_branch_publications for all to authenticated
 using (exists (select 1 from public.memberships m where m.business_id=catalog_branch_publications.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
 with check (exists (select 1 from public.memberships m where m.business_id=catalog_branch_publications.business_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));

-- Maintain original guest menu contract; append central categories with branch-published active products only.
create or replace function public.public_branch_menu(p_branch uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 with legacy as (
   select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name_ar',c.name_ar,'name_tr',c.name_tr,
      'items',coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'name_ar',i.name_ar,'name_tr',i.name_tr,
        'description_ar',i.description_ar,'description_tr',i.description_tr,
        'price_minor',i.price_minor,'image_url',i.image_url
      ) order by i.sort_order,i.created_at)
      from public.menu_items i
      where i.branch_id=p_branch and i.category_id=c.id and i.active and i.available),'[]'::jsonb)
   ) order by c.sort_order,c.created_at),'[]'::jsonb) AS data
   from public.menu_categories c where c.branch_id=p_branch and c.active
 ), central as (
   select coalesce(jsonb_agg(jsonb_build_object(
     'id',cat.id,'name_ar',cat.name_ar,'name_tr',cat.name_tr,
     'items',coalesce((select jsonb_agg(jsonb_build_object(
       'id',prod.id,'name_ar',prod.name_ar,'name_tr',prod.name_tr,
       'description_ar',prod.description_ar,'description_tr',prod.description_tr,
       'price_minor',coalesce(pub.price_override_minor,prod.price_minor),'image_url',prod.image_url
     ) order by pub.sort_order,pub.created_at)
     from public.catalog_products prod
     join public.catalog_branch_publications pub on pub.product_id=prod.id and pub.business_id=cat.business_id
     where prod.category_id=cat.id and prod.business_id=cat.business_id and prod.active
       and pub.branch_id=p_branch and pub.active and pub.available),'[]'::jsonb)
   ) order by cat.sort_order,cat.created_at),'[]'::jsonb) AS data
   from public.catalog_categories cat
   where cat.active and exists (
    select 1 from public.catalog_products prod
    join public.catalog_branch_publications pub on pub.product_id=prod.id and pub.business_id=cat.business_id
    where prod.category_id=cat.id and prod.business_id=cat.business_id and prod.active
      and pub.branch_id=p_branch and pub.active and pub.available
   )
 )
 select legacy.data || central.data from legacy cross join central
$$;
revoke all on function public.public_branch_menu(uuid) from public,anon,authenticated;
grant execute on function public.public_branch_menu(uuid) to anon,authenticated;
