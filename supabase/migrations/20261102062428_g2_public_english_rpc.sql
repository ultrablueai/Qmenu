-- Public read-only localization, preserves existing function signatures and branch isolation.
create or replace function public.public_branch_menu(p_branch uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 with legacy as (
   select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name_ar',c.name_ar,'name_tr',c.name_tr,'name_en',coalesce(nullif(c.name_en,''),c.name_ar),
      'items',coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'name_ar',i.name_ar,'name_tr',i.name_tr,'name_en',coalesce(nullif(i.name_en,''),i.name_ar),
        'description_ar',i.description_ar,'description_tr',i.description_tr,'description_en',coalesce(nullif(i.description_en,''),i.description_ar),
        'price_minor',i.price_minor,'image_url',i.image_url
      ) order by i.sort_order,i.created_at)
      from public.menu_items i
      where i.branch_id=p_branch and i.category_id=c.id and i.active and i.available),'[]'::jsonb)
   ) order by c.sort_order,c.created_at),'[]'::jsonb) AS data
   from public.menu_categories c where c.branch_id=p_branch and c.active
 ), central as (
   select coalesce(jsonb_agg(jsonb_build_object(
     'id',cat.id,'name_ar',cat.name_ar,'name_tr',cat.name_tr,'name_en',coalesce(nullif(cat.name_en,''),cat.name_ar),
     'items',coalesce((select jsonb_agg(jsonb_build_object(
       'id',prod.id,'name_ar',prod.name_ar,'name_tr',prod.name_tr,'name_en',coalesce(nullif(prod.name_en,''),prod.name_ar),
       'description_ar',prod.description_ar,'description_tr',prod.description_tr,'description_en',coalesce(nullif(prod.description_en,''),prod.description_ar),
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

CREATE OR REPLACE FUNCTION public.public_catalog_product_details(p_branch uuid,p_product uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT jsonb_build_object(
   'id', p.id,
   'name_ar',p.name_ar, 'name_tr',p.name_tr,'name_en',coalesce(nullif(p.name_en,''),p.name_ar),
   'description_ar',p.description_ar,'description_tr',p.description_tr,'description_en',coalesce(nullif(p.description_en,''),p.description_ar),
   'image_url',p.image_url,
   'price_minor',coalesce(pub.price_override_minor,p.price_minor),
   'ingredients',coalesce((
     SELECT jsonb_agg(jsonb_build_object(
      'name_ar',i.name_ar,'name_tr',i.name_tr,'name_en',coalesce(nullif(i.name_en,''),i.name_ar),'is_optional',i.is_optional
     ) ORDER BY i.sort_order,i.created_at)
     FROM public.catalog_product_ingredients i
     WHERE i.product_id=p.id AND i.business_id=p.business_id
   ),'[]'::jsonb),
   'groups',coalesce((
     SELECT jsonb_agg(jsonb_build_object(
       'id',g.id,'name_ar',g.name_ar,'name_tr',g.name_tr,'name_en',coalesce(nullif(g.name_en,''),g.name_ar),
       'min_select',g.min_select,'max_select',g.max_select,
       'options',coalesce((
         SELECT jsonb_agg(jsonb_build_object(
          'id',o.id,'name_ar',o.name_ar,'name_tr',o.name_tr,'name_en',coalesce(nullif(o.name_en,''),o.name_ar),'price_delta_minor',o.price_delta_minor
         ) ORDER BY o.sort_order,o.created_at)
         FROM public.catalog_modifier_options o WHERE o.group_id=g.id AND o.business_id=p.business_id AND o.active
       ),'[]'::jsonb)
     ) ORDER BY g.sort_order,g.created_at)
     FROM public.catalog_modifier_groups g WHERE g.product_id=p.id AND g.business_id=p.business_id AND g.active
       AND (SELECT count(*) FROM public.catalog_modifier_options o WHERE o.group_id=g.id AND o.business_id=p.business_id AND o.active)>=g.min_select
   ),'[]'::jsonb)
 )
 FROM public.catalog_products p
 JOIN public.catalog_categories c ON c.id=p.category_id AND c.business_id=p.business_id AND c.active
 JOIN public.catalog_branch_publications pub ON pub.product_id=p.id AND pub.business_id=p.business_id AND pub.branch_id=p_branch
 JOIN public.branches b ON b.id=pub.branch_id AND b.business_id=p.business_id
 WHERE p.id=p_product AND p.active AND pub.active AND pub.available LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_catalog_product_details(uuid,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_catalog_product_details(uuid,uuid) TO anon,authenticated;
COMMENT ON FUNCTION public.public_catalog_product_details(uuid,uuid)
 IS 'Read-only published catalog details and customization options for guest display; totals and option eligibility must be revalidated in G3 server order flow.';
