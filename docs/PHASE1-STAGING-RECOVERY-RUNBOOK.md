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

## Windows operator backup utility — 2026-11-02
The checked-in script `scripts/g1-staging-backup.ps1` is a **Staging-only export utility**, not evidence that a backup or restore exists. It rejects the wrong Git checkout, origin and branch, requires a running local Docker Desktop engine and the Supabase CLI, links only to project `qandxrcuetwzenlqspez`, and exports `roles.sql`, `schema.sql`, `data.sql` with per-file SHA256 values in a manifest outside the Git working tree. It does not invoke any restoration, edit Production, or push database files. The operator runs it locally with their authorized Supabase login and database password; no passwords must be posted in conversation, scripts, Git or logs. The output is **plaintext sensitive data** until separately encrypted. Immediately encrypt it with a locally trusted tool and do not sync plaintext through cloud drives, chat or source control.

From a verified checkout of `feat/g1-foundation` on the operator's Windows computer:
```powershell
git.exe -C "D:\Users\abc\Documents\ChatGPT\Beger\Qmenu" pull --ff-only origin feat/g1-foundation
powershell -ExecutionPolicy Bypass -File "D:\Users\abc\Documents\ChatGPT\Beger\Qmenu\scripts\g1-staging-backup.ps1"
```
The first command must exit 0. This script requires installed `supabase` and `docker`, and a running Docker Desktop engine. It will prompt for authorization locally as needed. Success means `BACKUP_EXPORT_COMPLETE` **only**, not `G1 GO`. The operator should share *only* successful completion and scrubbed manifest metadata, never exported SQL or access tokens.

An isolated restore remains a **separate mandatory task** against a disposable local self-hosted Supabase instance, with non-production credentials and outgoing email/notifications disabled. Follow the official Supabase platform-to-self-hosted guide and compatibility checks documented above. This repo script deliberately does not take a restore URL or offer destructive shortcuts. **RESTORE NOT VERIFIED** unless a separate restore, RLS verification and count comparison are performed and recorded.

## Executed local recovery drill — 2026-11-02 (supersedes earlier "not executed" historical wording)
**Result: PARTIAL PASS — schema and non-vector data successfully restored and checked; full backup fidelity/roles unresolved.** The initial instructions and status above are retained as the historical pre-execution plan; **this section is the current evidence**.

- Operator (Windows Docker Desktop/Supabase CLI 2.122.0) exported `roles.sql`, `schema.sql`, and `data.sql` from **Staging only**. Export success marker: `BACKUP_EXPORT_COMPLETE`. Original export stored in a private directory outside source checkout and encrypted with 7z according to operator confirmation. The manifest/SHA256 verification was operator-confirmed; plaintext SQL contents were never uploaded to GitHub/chat.
- First combined restore failed on `roles.sql` attempting `log_min_messages` without adequate privilege. **Roles are not certified restored.** Second schema/data restore failed on `storage.buckets_vectors`. Local target public table count remained zero after rollback.
- Re-exported **Staging data only** to `data-recovery.sql`, excluding the two Supabase-managed vector-storage tables (`storage.buckets_vectors`, `storage.vector_indexes`) in accordance with Supabase backup guidance. Ran schema+recovery-data import with `psql --single-transaction -v ON_ERROR_STOP=1` into the sole dedicated local container `supabase_db_Beger-recovery-standard`, not linked to Production or active Staging. Operator terminal marker: `BEGER_RESTORE_SUCCESS`.
- Recovery counts: **12 public tables / 12 with RLS / 11 RLS policies / 2 Auth accounts**. Cross-checked live Staging read-only: same four counts, and **all 12 individual public table row counts identical** (`businesses=2`, `branches=2`, `memberships=2`, `platform_admins=1`, `audit_logs=2`, other seven tables empty). Auth aggregates match Staging (`total=2, distinct_ids=2, email_confirmed=2`). Recovery and Staging also both yield zero for orphan membership, orphan branch and business-without-membership checks.
- The local recovery `supabase/tests/g1_tenant_isolation.psql` PostgreSQL-role impersonation/transactional rollback probe returned `BEGER_TENANT_ISOLATION_PASS` (operator-reported). This is **SQL simulation, not two real authenticated bearer-token sessions**.
- Exposure assessment: local Docker binds showed `0.0.0.0` and `::` on Beger service ports despite a Docker network configured for loopback. Operator installed a Windows inbound blocking firewall rule and reported failed cross-device LAN access to local Studio. This is a sampled negative network test, **not a guarantee of isolation for all adapters/networks**. Local development service secrets are insecure defaults and must not be used publicly.
- The logical restore exercise **does not cover** full `roles.sql` import, managed vector-storage data, Storage objects, Edge Functions, live auth-session login on the clone, external credentials/configuration, role-equivalence diff or row-by-row digest comparison. No claim of full disaster-recovery certification or commercial GO is justified.
- **Disposition:** Source exports + local recovery of required public schema/data and two Auth records is demonstrated, with row count consistency and transactional tenant RLS simulation. Finish the remaining auth-token API negative check and resolve the roles restore scope; document/accept Free-tier password-protection caveat as release policy. Until then keep `G1 NO-GO`, never merge `main`/deploy Production without explicit owner approval.
