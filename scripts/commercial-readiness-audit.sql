-- BEGER/Qmenu commercial audit: read-only, aggregate-only, non-PII.
-- Run manually against the isolated STAGING project only.
-- Never use aggregate counts as certification of billing, security or recovery.
-- Requires a database maintenance role; no direct public client access.
-- No DDL, DML, session changes, fake records or production mutation.
with exposure as (
  select count(*) filter (where c.relrowsecurity = false)::integer
    as public_tables_without_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')
), functions as (
  select
    count(*) filter (
      where p.prosecdef and pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    )::integer as anon_definer_executable,
    count(*) filter (
      where p.prosecdef and pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    )::integer as authenticated_definer_executable
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select
  current_timestamp as checked_at,
  (select count(*) from public.businesses) as businesses,
  (select count(*) from public.branches) as branches,
  (select count(*) from public.plans) as plans,
  (select count(*) from public.plans where active) as active_plans,
  (select count(*) from public.subscriptions) as subscriptions,
  (select count(*) from public.g3_orders) as orders,
  exposure.public_tables_without_rls,
  functions.anon_definer_executable,
  functions.authenticated_definer_executable,
  false as commercial_go,
  false as billing_certified
from exposure cross join functions;
