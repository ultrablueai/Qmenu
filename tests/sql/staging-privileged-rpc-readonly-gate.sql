-- Staging-only, read-only Phase 1 privilege regression; no data mutation.
-- Static checks complement, but never replace, real browser and Data API tests.
do $gate$
declare expected text[] := array['assign_branch_staff','create_first_business',
'platform_admin_audit_overview','platform_admin_business_directory',
'platform_admin_overview','platform_admin_trial_overview',
'platform_owner_access_roster','platform_owner_create_plan',
'platform_owner_set_plan_active','platform_owner_start_trial'];
found_count integer; bad text;
begin
 select count(*) into found_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 and has_function_privilege('authenticated',p.oid,'execute');
 if found_count<>array_length(expected,1) then
 raise exception 'Authenticated privileged RPC inventory drift: %',found_count;end if;
 select p.proname into bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and has_function_privilege('authenticated',p.oid,'execute')
 and (not p.proname=any(expected)
  or has_function_privilege('anon',p.oid,'execute')
  or coalesce(array_to_string(p.proconfig,','),'') not like '%search_path=%'
  or position('auth.uid()' in pg_get_functiondef(p.oid))=0
  or (p.proname like 'platform_%' and position('platform_admins' in pg_get_functiondef(p.oid))=0)
  or (p.proname='assign_branch_staff' and position('memberships' in pg_get_functiondef(p.oid))=0))
 limit 1;
 if bad is not null then raise exception 'Privileged RPC needs manual guard review: %',bad;end if;
 if exists(select 1 from pg_tables where schemaname='public' and rowsecurity=false)
 then raise exception 'Public table without RLS';end if;
 raise notice 'PASS: privileged authenticated RPC allowlist/guard and public RLS';
end $gate$;
