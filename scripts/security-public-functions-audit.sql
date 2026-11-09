-- BEGER security gate: detect newly exposed SECURITY DEFINER functions.
-- READ ONLY: against isolated Staging; intended public functions are allowlisted by name AND signature.
-- Does not revoke access or interrupt guest QR/order paths.
with allowed(proname, arguments) as (
 values
 ('g3_pickup_order_enabled','p_branch uuid'),
 ('g3_public_order_status','p_token uuid'),
 ('g3_submit_pickup_order','p_branch uuid, p_request_id uuid, p_items jsonb'),
 ('g3_submit_table_order','p_table_token uuid, p_request_id uuid, p_items jsonb'),
 ('g3_table_order_enabled','p_table_token uuid'),
 ('g5_loyalty_card','p_branch uuid, p_wallet_token uuid'),
 ('g5_loyalty_claim','p_order_token uuid, p_wallet_token uuid'),
 ('g5_order_rating_state','p_token uuid'),
 ('g5_submit_order_rating','p_token uuid, p_stars integer, p_comment text'),
 ('g6_pager_display_status','p_token uuid'),
 ('g6_pager_public_status','p_token uuid'),
 ('public_branch_identity','p_branch uuid'),
 ('public_branch_menu','p_branch uuid'),
 ('public_business_menu_appearance','p_branch uuid'),
 ('public_catalog_product_details','p_branch uuid, p_product uuid'),
 ('public_table_locator','p_token uuid')
), actual as (
 select p.proname::text as proname,
   pg_catalog.pg_get_function_identity_arguments(p.oid)::text as arguments,
   coalesce('search_path=""' = any(p.proconfig),false) as locked_search_path
 from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 and pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
), unexpected as (
 select a.proname,a.arguments,a.locked_search_path from actual a
 where not exists (
  select 1 from allowed x where x.proname=a.proname and x.arguments=a.arguments
 )
), missing as (
 select x.proname,x.arguments from allowed x
 where not exists (
  select 1 from actual a where a.proname=x.proname and a.arguments=x.arguments
 )
)
select current_timestamp as checked_at,
 (select count(*) from actual) as anonymous_definer_count,
 (select count(*) from unexpected) as unexpected_exposures,
 (select count(*) from missing) as missing_expected_public_functions,
 (select count(*) from actual where not locked_search_path) as unlocked_search_paths,
 (select coalesce(jsonb_agg(jsonb_build_object('function',proname,'signature',arguments)),'[]'::jsonb) from unexpected) as unexpected_details,
 (select coalesce(jsonb_agg(jsonb_build_object('function',proname,'signature',arguments)),'[]'::jsonb) from missing) as missing_details,
 ((select count(*) from unexpected)=0 and (select count(*) from missing)=0
  and (select count(*) from actual where not locked_search_path)=0) as public_function_baseline_pass;
