-- Beger G26: read-only elevated function security baseline on isolated Staging.
-- Verifies function exposure drift, not complete semantic authorization or JWT E2E.
-- Does not make any role/grant/schema changes.
with audited as (
 select p.oid, p.proname::text as name,
 pg_catalog.pg_get_function_identity_arguments(p.oid)::text as signature,
 pg_catalog.pg_get_functiondef(p.oid) as body,
 coalesce('search_path=""'=any(p.proconfig),false) as fixed_path
 from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 and pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
), classifications as (
 select *,
 case
 when pg_catalog.has_function_privilege('anon',oid,'EXECUTE') then 'guest_public'
 when body ilike '%auth.uid()%' then 'direct_auth_check_candidate'
 when body ilike '%allowed(%' or body ilike '%authorized(%' then 'delegated_auth_candidate'
 when name='g17_print_job_action'
   and body like '%public.g18_print_job_action(p_job,p_action,null)%'
   then 'verified_print_wrapper'
 else 'manual_review_required'
 end as review_class
 from audited
), totals as (
 select
 count(*) as total_authenticated_definers,
 count(*) filter(where review_class='guest_public') as guest_public,
 count(*) filter(where review_class='direct_auth_check_candidate') as direct_auth_check_candidates,
 count(*) filter(where review_class='delegated_auth_candidate') as delegated_auth_candidates,
 count(*) filter(where review_class='verified_print_wrapper') as verified_print_wrapper,
 count(*) filter(where review_class='manual_review_required') as manual_review_required,
 count(*) filter(where not fixed_path) as missing_fixed_search_path
 from classifications
)
select current_timestamp as checked_at,totals.*,
 (select coalesce(jsonb_agg(jsonb_build_object('function',name,'signature',signature)),'[]'::jsonb)
   from classifications where review_class='manual_review_required') as manual_review_details,
 (manual_review_required=0 and missing_fixed_search_path=0) as baseline_pass
from totals;
