# Beger — Phase 1 staging recovery and release evidence (2026-11-01)

Status: READ-ONLY BASELINE VERIFIED; restore rehearsal NOT COMPLETE. NO-GO.

## Environment separation
- GitHub source: `ultrablueai/Qmenu`, branch `feat/g1-foundation` and draft PR #1.
- Staging Vercel: `qmenu-staging`, Preview only, restricted to staging Supabase URL.
- Staging Supabase project: `qandxrcuetwzenlqspez` (Paris). 
- Primary Supabase project `fstpxknegaxppjilbnke` is a NO-TOUCH boundary.
- Never use an admin/service-role secret in a browser, repository, exported runbook, or shared log.

## Live read-only baseline from staging
- 13 applied migrations (checked against Supabase migration inventory).
- 12 public tables, all 12 RLS enabled.
- 2 real businesses, 2 branches, 2 memberships, 1 enabled platform admin.
- 0 live branch assignments, 0 plans, 0 subscriptions.
- The retired customer-card issue/rotate/deactivate/scan RPCs are disabled to both anon and authenticated; do not re-enable in Phase 1.
- Latest independently verified Vercel Preview commit `3b511ad` READY with 99/99 Node tests; production not deployed.
- **This is inventory evidence, NOT a restore test or real user browser E2E.**

## Restore / rollback runbook (requires separate owner-approved nonproduction environment)
1. Freeze writes to the target *disposable clone*, not active Staging or Production. Record Git SHA, migration list, data row counts, and the precise failure.
2. Confirm backup/restore availability **in the Supabase dashboard or using approved database tooling**, including retention/plan support. No backup availability is assumed here.
3. Obtain an owner-approved isolated restore target and verified encrypted backup. Do not overwrite an active Staging or Production database.
4. Restore on that clone, with secrets rotated and outbound email/payment/notification delivery disabled. Never connect a restored clone to real production clients.
5. Validate migration versions, table counts, tenant RLS, Auth references, RPC grants, storage references and role boundaries. Run `tests/sql/staging-privileged-rpc-readonly-gate.sql` on the clone.
6. Exercise owner/merchant browser navigation using approved test identities; compare scoped business/branch data. Check missing, stale or mismatched data explicitly.
7. If a migration fails, roll forward with a reviewed compensating migration (or restore only the isolated clone). Do not reverse data-bearing migrations ad hoc or drop tables on active databases.
8. Record restore duration, data integrity checks, gap between backup and recovery, actual operator, timestamps, incident and sign-off. Mark **RESTORE PASS** only with concrete observed evidence.

## Recovery acceptance still outstanding
- Obtain an isolated restore target and actual restorable backup (subject to owner approval and availability). Perform restore and independent checks there.
- Real authenticated browser E2E for two independent accounts, /admin denial, cross-tenant and branch authorization, mobile RTL/LTR, session refresh/signout/recovery.
- Review signed-in SECURITY DEFINER RPC exposure and enable/check leaked-password protection as supported; leave warning open until verified.
- No production deploy or main merge before complete Phase 1 GO gate and explicit owner approval.
