-- BEGER Phase 1: read-only staged authorization contract. No role switches, fixtures or writes.
-- This checks policy structure and confirmed account count. It is NOT real-session E2E.
with flags as (
 select
  (select count(*) from pg_tables where schemaname='public' and not rowsecurity)=0 as all_public_rls,
  (select count(*) from pg_policies where schemaname='public' and tablename='branches' and cmd='UPDATE' and with_check is not null and qual is not null)>=1 as branch_update_checked,
  (select count(*) from pg_policies where schemaname='public' and tablename='branches' and cmd='SELECT' and qual ilike '%branch_assignments%')=1 as staff_branch_scoped,
  (select count(*) from pg_policies where schemaname='public' and tablename='memberships' and cmd='SELECT' and qual ilike '%auth.uid()%')>=1 as membership_self_read,
  (select count(distinct m.business_id) from public.memberships m join auth.users u on u.id=m.user_id where u.email_confirmed_at is not null)>=2 as two_confirmed_businesses,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute'))=0 as no_anon_privileged,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('issue_business_customer_qr','rotate_business_customer_qr','deactivate_business_customer_qr','scan_business_customer_qr') and not has_function_privilege('authenticated',p.oid,'execute'))=4 as legacy_qr_disabled,
  not has_table_privilege('authenticated','public.audit_logs','SELECT') as audit_not_exposed,
  not has_table_privilege('authenticated','public.platform_audit_events','SELECT') as platform_audit_not_exposed
)
select *, (all_public_rls and branch_update_checked and staff_branch_scoped and membership_self_read and two_confirmed_businesses and no_anon_privileged and legacy_qr_disabled and audit_not_exposed and platform_audit_not_exposed) as phase1_rls_contract_pass from flags;
