-- Beger G2 non-mutating Staging acceptance inventory.
-- This proves schema/grants presence, not customer browser E2E.
WITH relations AS (
 SELECT
  count(*) FILTER (WHERE rowsecurity) AS rls,
  count(*) AS total
 FROM pg_tables WHERE schemaname='public'
 AND tablename IN ('menu_categories','menu_items','dining_tables')
), policies AS (
 SELECT count(*) AS policy_count FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('menu_categories','menu_items','dining_tables')
), counts AS (
 SELECT (SELECT count(*) FROM public.menu_categories) AS category_rows,
        (SELECT count(*) FROM public.menu_items) AS item_rows,
        (SELECT count(*) FROM public.dining_tables) AS table_rows
)
SELECT
 relations.total AS g2_tables,
 relations.rls AS g2_rls_tables,
 policies.policy_count AS g2_policies,
 NOT has_table_privilege('anon','public.menu_categories','SELECT') AS anon_raw_categories_denied,
 NOT has_table_privilege('anon','public.menu_items','SELECT') AS anon_raw_items_denied,
 NOT has_table_privilege('anon','public.dining_tables','SELECT') AS anon_raw_tables_denied,
 has_function_privilege('anon','public.public_branch_menu(uuid)','EXECUTE') AS anon_public_menu_allowed,
 has_function_privilege('anon','public.public_table_locator(uuid)','EXECUTE') AS anon_table_locator_allowed,
 (SELECT count(*) FROM public.public_branch_menu('00000000-0000-4000-8000-000000000000') AS menu) = 1 AS unknown_branch_returns_safe_array,
 counts.category_rows,counts.item_rows,counts.table_rows
FROM relations CROSS JOIN policies CROSS JOIN counts;
