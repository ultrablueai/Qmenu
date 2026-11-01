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


## Verified project plan and cost constraints (2026-11-01)
- Independently retrieved organization `Smart Qmenu` subscription: **Free**; staging project health `ACTIVE_HEALTHY`. This means hosted automatic daily backups and leaked-password checks are **NOT available** on this plan. Neither is evidence of a successful backup or a leaked password event.
- Official Supabase documentation: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore ; https://supabase.com/docs/guides/auth/password-security .
- **Free-plan route**: manual encrypted logical export using CLI, then independently restore and validate on an owner-approved isolated local/disposable database. This requires operator-only credentials and tools; never perform it against the production project, never commit SQL dumps, and never request a database password in chat.

### Approved manual export procedure (NOT yet executed)
From a secure developer laptop with current Supabase CLI, Docker available and project ownership verified:
```sh
supabase link --project-ref qandxrcuetwzenlqspez
mkdir -p backups
supabase db dump --linked -f backups/roles.sql --role-only
supabase db dump --linked -f backups/schema.sql
supabase db dump --linked -f backups/data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```
These follow Supabase's documented logical backup approach. A Supabase CLI dump can omit managed Auth/Storage schemas or require separate handling of custom Auth/Storage changes; validate with the official restore guide before treating the export as comprehensive. Securely encrypt the resulting files off-repository and retain a verifiable checksum and date. The `backups/` path and common dump filenames are excluded in repository `.gitignore`. Do not trust an untested export as a completed recovery drill.

### Password defense while the Supabase organization remains Free
- The project signup UI requires a 12-character minimum. **This is client-side validation only**; the live Supabase Auth server-side minimum, character rules, breached-password screening and login throttling must be verified/configured in the dashboard by an authorized admin.
- Supabase leaked-password protection itself is Pro-only. Do not mislabel this platform-tier limitation as an exploitable breach or a resolved security warning. Reassess paid-plan security before commercial release.
- Staging phase acceptance may document this compensating-control limitation explicitly, but **commercial GO remains prohibited** until final approved security policy and other gates pass.

## Recovery acceptance still outstanding
- Obtain an isolated restore target and actual restorable backup (subject to owner approval and availability). Perform restore and independent checks there.
- Real authenticated browser E2E for two independent accounts, /admin denial, cross-tenant and branch authorization, mobile RTL/LTR, session refresh/signout/recovery.
- Review signed-in SECURITY DEFINER RPC exposure and enable/check leaked-password protection as supported; leave warning open until verified.
- No production deploy or main merge before complete Phase 1 GO gate and explicit owner approval.

## Verified isolated restore command reference (2026-11-01)
Official Supabase guide: https://supabase.com/docs/guides/self-hosting/restore-from-platform .
For a separately approved disposable self-hosted Supabase clone, the guide uses:
```sh
# Operator executes locally; no credentials in Git/chat. Read the official guide first.
# Put actual dump files outside version control and encrypt the backup.
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file backups/roles.sql --file backups/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file backups/data.sql --dbname "$ISOLATED_RESTORE_DATABASE_URL"
```
The clone must have compatible PostgreSQL/Supabase extensions and managed schemas. Platform PostgreSQL 17 can differ from a self-hosted version; resolve mismatches *only in the clone* and run the restore again. The exported DB does not automatically restore storage objects, Edge Functions, SMTP/OAuth configuration or other external services. Never use this command with the live Staging or primary project's database URL. `ISOLATED_RESTORE_DATABASE_URL` must refer to an approved disposable local database. Do not send it into chat.

**Verification sequence after isolated restore:** 13 expected migration records where applicable; 12 public tables with RLS; two scoped businesses and branches and memberships (compare against backup date); audited privileged RPC grants; branch isolation and rejection of retired QR RPCs. Real session testing requires regenerated clone credentials and accounts; don't reuse live access tokens. If restoration is not performed, record it as NOT VERIFIED.
