-- Beger Staging-only: tenant-composite FK access paths for high-use catalog/branch flows.
-- Index creation only: no changes to data, permissions, payment, or QR rate limits.
create index if not exists beg_branch_assignments_business_branch_fk_idx
 on public.branch_assignments(business_id,branch_id);
create index if not exists beg_branch_assignments_business_user_fk_idx
 on public.branch_assignments(business_id,user_id);
create index if not exists beg_catalog_publications_branch_business_fk_idx
 on public.catalog_branch_publications(branch_id,business_id);
create index if not exists beg_catalog_publications_product_business_fk_idx
 on public.catalog_branch_publications(product_id,business_id);
create index if not exists beg_catalog_modifier_groups_product_business_fk_idx
 on public.catalog_modifier_groups(product_id,business_id);
create index if not exists beg_catalog_modifier_options_group_business_fk_idx
 on public.catalog_modifier_options(group_id,business_id);
create index if not exists beg_catalog_product_ingredients_product_business_fk_idx
 on public.catalog_product_ingredients(product_id,business_id);
create index if not exists beg_dining_tables_branch_business_fk_idx
 on public.dining_tables(branch_id,business_id);
