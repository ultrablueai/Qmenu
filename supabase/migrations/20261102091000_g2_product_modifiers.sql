-- BEGER G2: product ingredients and menu customization definitions.
-- This migration adds definitions/read-only previews ONLY. Order pricing validation is G3.
CREATE TABLE public.catalog_product_ingredients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 product_id uuid NOT NULL,
 name_ar text NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 1 AND 120),
 name_tr text NOT NULL CHECK (char_length(btrim(name_tr)) BETWEEN 1 AND 120),
 is_optional boolean NOT NULL DEFAULT false,
 sort_order int NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (product_id,business_id) REFERENCES public.catalog_products(id,business_id) ON DELETE CASCADE
);
CREATE INDEX ON public.catalog_product_ingredients(product_id,sort_order);
CREATE TABLE public.catalog_modifier_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 product_id uuid NOT NULL,
 name_ar text NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 1 AND 120),
 name_tr text NOT NULL CHECK (char_length(btrim(name_tr)) BETWEEN 1 AND 120),
 min_select int NOT NULL DEFAULT 0 CHECK (min_select BETWEEN 0 AND 20),
 max_select int NOT NULL DEFAULT 1 CHECK (max_select BETWEEN 1 AND 20),
 active boolean NOT NULL DEFAULT true,
 sort_order int NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT catalog_modifier_group_range CHECK (min_select <= max_select),
 UNIQUE(id,business_id),
 FOREIGN KEY (product_id,business_id) REFERENCES public.catalog_products(id,business_id) ON DELETE CASCADE
);
CREATE INDEX ON public.catalog_modifier_groups(product_id,sort_order);
CREATE TABLE public.catalog_modifier_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 group_id uuid NOT NULL,
 name_ar text NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 1 AND 120),
 name_tr text NOT NULL CHECK (char_length(btrim(name_tr)) BETWEEN 1 AND 120),
 price_delta_minor bigint NOT NULL DEFAULT 0 CHECK (price_delta_minor BETWEEN 0 AND 100000000000),
 active boolean NOT NULL DEFAULT true,
 sort_order int NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,business_id),
 FOREIGN KEY (group_id,business_id) REFERENCES public.catalog_modifier_groups(id,business_id) ON DELETE CASCADE
);
CREATE INDEX ON public.catalog_modifier_options(group_id,sort_order);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['catalog_product_ingredients','catalog_modifier_groups','catalog_modifier_options'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM public, anon, authenticated',t);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',t);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=%I.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''manager''))) WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=%I.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN (''owner'',''manager'')))',
    'hq_manage_'||t,t,t,t
  );
 END LOOP;
END $$;

-- A table QR or guessed product UUID is not authority to read unpublished item details.
-- Function does not expose business internal IDs, customer data, staff data or order actions.
CREATE FUNCTION public.public_catalog_product_details(p_branch uuid,p_product uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT jsonb_build_object(
   'id', p.id,
   'name_ar',p.name_ar, 'name_tr',p.name_tr,
   'description_ar',p.description_ar,'description_tr',p.description_tr,
   'image_url',p.image_url,
   'price_minor',coalesce(pub.price_override_minor,p.price_minor),
   'ingredients',coalesce((
     SELECT jsonb_agg(jsonb_build_object(
      'name_ar',i.name_ar,'name_tr',i.name_tr,'is_optional',i.is_optional
     ) ORDER BY i.sort_order,i.created_at)
     FROM public.catalog_product_ingredients i
     WHERE i.product_id=p.id AND i.business_id=p.business_id
   ),'[]'::jsonb),
   'groups',coalesce((
     SELECT jsonb_agg(jsonb_build_object(
       'id',g.id,'name_ar',g.name_ar,'name_tr',g.name_tr,
       'min_select',g.min_select,'max_select',g.max_select,
       'options',coalesce((
         SELECT jsonb_agg(jsonb_build_object(
          'id',o.id,'name_ar',o.name_ar,'name_tr',o.name_tr,'price_delta_minor',o.price_delta_minor
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
