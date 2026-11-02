-- Beger G2 — tenant-owned public menu appearance and third locale.
-- Additive, Staging only; previous merchant data and QR identifiers preserved.
CREATE TABLE public.business_menu_appearance (
 business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
 theme text NOT NULL DEFAULT 'clean_light' CHECK (theme IN ('luxe_dark','clean_light','bold_commerce')),
 default_lang text NOT NULL DEFAULT 'ar' CHECK (default_lang IN ('ar','tr','en')),
 enabled_languages text[] NOT NULL DEFAULT ARRAY['ar','tr','en']::text[],
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT beg_menu_nonempty_lang CHECK (array_length(enabled_languages,1) BETWEEN 1 AND 3),
 CONSTRAINT beg_menu_valid_langs CHECK (enabled_languages <@ ARRAY['ar','tr','en']::text[]),
 CONSTRAINT beg_menu_no_duplicate_langs CHECK (\n  (array_length(enabled_languages,1)<2 OR enabled_languages[1]<>enabled_languages[2]) AND\n  (array_length(enabled_languages,1)<3 OR (enabled_languages[1]<>enabled_languages[3] AND enabled_languages[2]<>enabled_languages[3]))\n ),
 CONSTRAINT beg_menu_default_enabled CHECK (default_lang=ANY(enabled_languages))
);
ALTER TABLE public.business_menu_appearance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_menu_appearance FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.business_menu_appearance TO authenticated;
CREATE POLICY beg_appearance_select ON public.business_menu_appearance FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=business_menu_appearance.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')));
CREATE POLICY beg_appearance_insert ON public.business_menu_appearance FOR INSERT TO authenticated
 WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=business_menu_appearance.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')));
CREATE POLICY beg_appearance_update ON public.business_menu_appearance FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=business_menu_appearance.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')))
 WITH CHECK (EXISTS (SELECT 1 FROM public.memberships m WHERE m.business_id=business_menu_appearance.business_id AND m.user_id=(SELECT auth.uid()) AND m.role IN ('owner','manager')));
ALTER TABLE public.catalog_categories ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=100);
ALTER TABLE public.catalog_products ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=120);
ALTER TABLE public.catalog_products ADD COLUMN description_en text NOT NULL DEFAULT '' CHECK (char_length(description_en)<=1000);
ALTER TABLE public.catalog_product_ingredients ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=120);
ALTER TABLE public.catalog_modifier_groups ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=120);
ALTER TABLE public.catalog_modifier_options ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=120);
ALTER TABLE public.menu_categories ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=100);
ALTER TABLE public.menu_items ADD COLUMN name_en text CHECK (name_en IS NULL OR char_length(name_en)<=120);
ALTER TABLE public.menu_items ADD COLUMN description_en text NOT NULL DEFAULT '' CHECK (char_length(description_en)<=1000);

-- Public read returns only safe appearance choices, never merchant internal settings or accounts.
CREATE FUNCTION public.public_business_menu_appearance(p_branch uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT jsonb_build_object('theme',coalesce(s.theme,'clean_light'),
  'default_lang',coalesce(s.default_lang,'ar'),
  'enabled_languages',coalesce(s.enabled_languages,ARRAY['ar','tr','en']::text[]))
 FROM public.branches b LEFT JOIN public.business_menu_appearance s ON s.business_id=b.business_id
 WHERE b.id=p_branch LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_business_menu_appearance(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_business_menu_appearance(uuid) TO anon,authenticated;
