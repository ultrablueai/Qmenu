# Qmenu G1 acceptance — updated 2026-11-01

**Decision: NO-GO.** All work stays on draft PR #1; no production changes.

## Verified on independent Supabase Staging
- Project: `qandxrcuetwzenlqspez` (`Qmenu-steging`, EU West / Paris).
- Applied migrations: `g1_core_foundation`, `g1_first_owner_onboarding`, `g1_branch_management`, `g1_event_trigger_grants`, `g1_fk_indexes`.
- Six public tables exist and all six have RLS enabled.
- `anon` cannot execute `public.create_first_business`; authenticated users can.
- Neither `anon` nor `authenticated` can execute `public.rls_auto_enable()`.
- Successful transactional PostgreSQL integration scenario with two temporary test identities: owner onboarding for A and B, own-tenant SELECT only, denied cross-tenant branch UPDATE, duplicate owner onboarding denied. All test data rolled back.
- Second independent SQL RLS verification on Staging: direct foreign-tenant branch INSERT blocked, cross-tenant branch UPDATE blocked, direct membership/owner privilege escalation blocked, and tenant read isolation confirmed. The reusable scenario is committed in `supabase/tests/g1_tenant_isolation.psql`, with static contract coverage.
- After second test: 0 businesses, 0 branches, 0 memberships, 0 temporary test identities; anon cannot execute business onboarding.
- Post-test: zero businesses, branches, memberships, audit rows, and temporary test identities.
- Performance advisors: missing FK index warnings addressed. Unused-index notices are expected on empty staging and are not evidence to drop indexes.

## Code artifacts
- Repo: `ultrablueai/Qmenu`; draft [PR #1](https://github.com/ultrablueai/Qmenu/pull/1).
- Auth pages, membership-onboarding checks, migration files, static tests, and staging-only RLS probe committed.
- GitHub Actions currently blocked by the GitHub account's billing lock; no CI success claim.
- Vercel preview of G1 commit `2407ed3` achieved READY with successful Next.js compile, TypeScript verification and route generation. Subsequent failed previews belong to unrelated skill-only branch `feat/codex-engineering-skills` (NEXT_NO_VERSION), not G1.
- Vercel uses a branch-scoped build ignore rule and `npm test && npm run build`.
- New `scripts/verify-staging.mjs` safety gate is invoked by `npm run build`; rejects Vercel production target, wrong branch, wrong Supabase project, or missing publishable key. Seven negative/positive tests added; newest Vercel Preview build logged **36/36 Node tests passing** and `Qmenu staging deployment gate: staging_preview_only`.
- Npm-generated `package-lock.json` was extracted from a verified Staging preview build, integrity-checked and committed at `c980d7b0`. Vercel was switched to `npm ci --ignore-scripts --no-audit --no-fund`, and build `32c1e9a` finished READY after a successful clean `npm ci`, 36 tests and Next.js compilation. Temporary extraction script deleted at `ff8e351` and that preview also achieved READY. **Known warning:** Next.js still reports optional SWC entries missing in the lockfile, requiring future review; this did not fail the build.

## Mandatory remaining gates
- [x] `package-lock.json` committed; Vercel `npm ci` followed by Node tests and Next.js compile/typecheck/build succeeded on branch G1. GitHub Actions independent CI remains blocked by billing; SWC optional-dependency warning remains to review.
- [ ] Browser E2E auth: signup, confirmation, login, onboarding, logout; mobile checks.
- [ ] Cross-tenant tests using two real Supabase Auth sessions and Data API rather than only SQL role simulation.
- [x] Staging app built and published on Vercel (multiple READY previews, including `ff8e351`) with isolated staging credentials; health and browser/API diagnostics are still pending.
- [ ] Security review: `public.create_first_business` is an intentionally callable SECURITY DEFINER RPC restricted to authenticated users, but requires independent review/rate-limit considerations before production. Supabase advisory flags it.
- [ ] Staging Auth leaked-password protection advisor reviewed/configured as supported.
- [ ] Rollback and backup processes independently rehearsed before release.

## Boundaries
- Qmenu primary/production project `fstpxknegaxppjilbnke` was **not modified**.
- Do not merge to main, promote to production, or treat successful SQL simulation as browser E2E certification.

## Platform handoff and blockers
- See `docs/CONNECTED-PLATFORMS.md` for the canonical GitHub/Vercel/Supabase mapping and no-production boundaries.
- Real-browser Supabase confirmation + two-session API E2E: tracked in issue #3, still NOT VERIFIED.
- SWC optional-dependency warning, security advisors, recovery and independent CI: tracked in issue #4, still NO-GO for commercial release.
- The one-time lockfile export script has been removed after its generated artifact was committed. Never reintroduce a public lock export into normal CI.

## Current acceptance snapshot — 2026-11-01 (supersedes historical counts above)
**Decision: OPEN / NO-GO; this is Phase 1 Staging acceptance, NOT approval to ship Production.**

Verified precise commit `39a2f4e09fbe86baf9db13a68f879ffdd6958821` was pushed to PR #1's feature branch. Windows local run (Node 24) passed clean `npm ci`, 101/101 Node tests, `tsc --noEmit`, Next.js build and staging safety guard. The exact same commit reached Vercel Preview `dpl_AYdmRSWuEBX32P4H2JDLrom16EvD` (READY), and deployment logs independently confirmed **101 pass / 0 fail**. GitHub Actions still cannot start its jobs because the owner's GitHub billing account is locked; GitHub CI cannot be marked PASS.

Current Supabase Staging has **12/12 public tables with RLS**, two independently confirmed identities, two businesses, two branches and two memberships; owner confirms working account logins and dashboard navigation. Separate SQL session impersonation and read-only RLS structure checks passed, but actual browser negative access remains unverified.

**Security advisor review (read-only live verification 2026-11-01):** 10 permitted authenticated `SECURITY DEFINER` functions were listed and their complete PostgreSQL definitions inspected. Every one has a pinned `search_path`, uses `auth.uid()` identity checking, and explicitly checks platform-admin authority or business membership as applicable. A live read-only catalog query returned **10/10 checks passing**, with no anomalous function. They remain callable intentionally by `authenticated`, so the Supabase advisory's 10 WARN findings are **reviewed, not cleared**; live negative client tests are mandatory before accepting the design. No privileged definer is executable by `anon`. The 3 RLS/no-policy INFO tables intentionally have no client grants and deny access; the leaked-password screening WARN remains a Supabase Free-tier limitation. This review alone is **not a dynamic authorization penetration test**.

### Actual remaining GO evidence (no substitute by static tests)
1. **Two real browser sessions (owner + independently registered merchant):** verify owner `/admin` allowed; merchant `/admin` denied (including direct URL); merchant `/dashboard` shows only own business, branch; direct URL of the owner's branch yields 404/denial; no cross-tenant sensitive data returned. Capture result with a timestamp and only sanitized screenshot / route and account role, never authentication cookies, passwords, raw tokens or private business data.
2. **Session and mobile:** verify both dashboard sign-out buttons end the session and protected URLs redirect to login afterward; fresh sign-in, refresh, and expired session. Check mobile 320–390px Arabic RTL and Turkish navigation/layout without overflow. Owner has already verified login/navigation generally; do not request redoing those steps unless they cover a distinct negative case.
3. **Isolated recovery:** obtain and encrypt a logical database backup, restore into an owner-approved disposable instance, validate migrations, RLS, role grants and data counts; record restore command output, checksum, verification and date. Runbook: `docs/PHASE1-STAGING-RECOVERY-RUNBOOK.md`. **No backup or restore has been executed through the connected tools.**
4. **Security disposition:** operator/owner explicitly accept Staging Free-tier leaked-password-screening limitation, or upgrade/configure the capability before a commercial Production release. Recorded 10 RPC warnings are intentional *only if* the true-session negative cases pass.

**Release rule:** Mark Phase 1 `GO` only when the actual browser/mobile negative assertions and isolated restore drill are evidenced and reviewed. No automatic `main` merge or Production changes.

## Owner-confirmed live browser check — 2026-11-01
- **PASS (user-reported):** Using the ordinary merchant account in the live Staging browser, direct navigation to `/admin` displayed the access-denied/insufficient-permission message rather than the platform owner control panel. This is direct browser evidence reported by the owner, not an automated trace; browser/device and exact screenshot not captured here.
- Scope: ordinary merchant **platform-admin negative route** only. Does not establish tenant cross-access denial via a foreign branch URL, session sign-out success, expired session behavior, mobile layout, or backup/restore.
- Remaining G1 blockers persist, and Phase 1 remains **NO-GO** until all required gates are evidenced. No main or Production changes.

## Owner-supplied Android screenshots — 2026-11-01
- **PASS (visual / owner-supplied):** screenshot of ordinary merchant `ultraspeedweb` dashboard on phone, one linked business and one branch; platform administration navigation is not shown.
- **PASS (visual / owner-supplied):** separate `yastym5` merchant dashboard on phone, with `إدارة المنصة` navigation shown, one linked business and one branch.
- **PASS (visual / owner-supplied):** same platform-authorized owner's `/admin` dashboard on phone, showing platform summary of two merchants, two branches and two memberships, and a switch back to merchant dashboard.
- Previously supplied Android screenshot of ordinary merchant `/admin` displayed explicit access denied, confirming that separate merchant role does not get owner privileges.
- **NOT EVIDENCED by these screenshots:** tapping sign-out, subsequent unauthenticated `/dashboard` redirect, stale-session denial, direct foreign-tenant branch URL, Turkish/LTR layout, a cross-browser authenticated API negative test, or any isolated restore.
- These screenshots indicate mobile navigation and role separation on the sampled Android device; they do not establish comprehensive responsive QA for all viewport widths. Phase 1 remains **NO-GO** until the remaining gates are proved.

## Read-only relational integrity scan — 2026-11-01
- Live Staging verified: **2 owner memberships** and **zero** users with multiple business memberships, duplicate business owners, branch assignments without an appropriate business membership, assignments targeting a branch from a different business, orphan branches, or enabled platform admins with unconfirmed email. The result was observed directly from Supabase via a read-only SQL query.
- Saved exact repeatable, read-only SQL in `tests/sql/staging-phase1-account-integrity-readonly.sql`. This validates present data consistency, **not general role enforcement or real browser session sign-out**.
- Android owner-provided screenshots show merchant role denial on /admin and owner dual-role navigation. **No proof yet of what happens after clicking merchant 'خروج'.** Do not mark signout/session expiry PASS until a logout -> direct protected route attempt shows redirect to login, with the same browser context.
- Encrypted backup export, isolated restoration and verification remain NOT EXECUTED. Keep **G1 NO-GO**.

## Owner-confirmed same-browser sign-out check — 2026-11-02
- **PASS (owner-reported, actual Staging browser):** The merchant pressed the `خروج` action, then reopened the merchant `/dashboard` route in the same browser. The application required a new login instead of showing the previously authenticated dashboard.
- This covers merchant logout and protected-route redirect under the sampled browser session; it does not prove all-device/token revocation, automatic expiry behavior, platform-admin logout, or unauthenticated cross-tenant branch URLs.
- Combined with the earlier ordinary-merchant `/admin` denial and owner dual-role Android screenshots, these checks materially close real-browser G1 acceptance, but no backup/export/isolated restore rehearsal has yet been observed; **Phase 1 remains NO-GO until recovery gate and any remaining required security checks are actually demonstrated.**

## Staging logical dump completed — owner Windows CLI output, 2026-11-02
- **PASS (operator-reported completed export):** `supabase link` finished to dedicated Staging project `qandxrcuetwzenlqspez`; CLI pulled `public.ecr.aws/supabase/postgres:17.11.0.011` and reported successful exports of `roles.sql`, `schema.sql`, `data.sql`; operator terminal ended with `BACKUP_EXPORT_COMPLETE`.
- Destination (operator's private PC only; never upload SQL to repo/chat): `C:\Users\abc\Documents\Beger-private-backups\beger-staging-20261101T214122Z`. The script is expected to write a SHA-256 manifest; its contents and hashes have **not** been independently examined here. Plaintext export must be encrypted promptly.
- **NOT YET VERIFIED:** encrypted archive existence/integrity and **isolated restore** with schema/data/RLS checks. A successful dump alone does not certify recovery. Keep **G1 NO-GO** until the clone restore and remaining cross-tenant browser negative tests are verified.

## Isolated local SQL restore — operator-reported PASS, 2026-11-02
- Dedicated Windows/Docker target: `supabase_db_Beger-recovery-standard`; other project containers left intact. Operator observed `BEGER_RESTORE_SUCCESS` after transactional schema/data import using revised `data-recovery.sql` excluding `storage.buckets_vectors` and `storage.vector_indexes`.
- Read-only post-restore verification returned `public_tables=12`, `rls_tables=12`, `auth_users=2`, `rls_policies=11` (operator terminal). This confirms RLS enabled on all 12 public tables and presence of two Auth users, not yet direct tenant/privilege behavioral validation.
- Earlier `roles.sql` import failed on `log_min_messages` privilege: full roles restoration **not certified**. Neither account-level identity equivalence nor per-table counts/source-to-restore equality nor full end-to-end sign-in on restored Auth has been certified. Existing staging browser tests and signout checks are separately tracked above.
- Security caveat: Supabase development service ports were still published on `0.0.0.0`; operator configured a blocking Windows inbound firewall rule, changed Docker Backend inbound allow rule to Private, and reported a failed same-LAN access test to Studio. This does **not** prove universal network isolation. Local environment uses shared development credentials; never publicly expose it.
- **G1 remains NO-GO** pending equivalence and negative permission checks, source-vs-restore consistency, and explicit treatment of incomplete role restore / other acceptance gates.

## Local recovery vs Staging row-count comparison — 2026-11-02
- Live, read-only Staging SQL counts matched operator's isolated local restore for **all 12 public tables**: `audit_logs=2`, `branch_assignments=0`, `branches=2`, `business_customers=0`, `businesses=2`, `customer_qr_scan_attempts=0`, `customer_qr_scans=0`, `memberships=2`, `plans=0`, `platform_admins=1`, `platform_audit_events=0`, `subscriptions=0`.
- This certifies **row counts only**, not row-by-row identity, auth continuity, or effective RLS permissions. The restores of `roles.sql` and vector storage tables were intentionally not completed; see previously documented limitations. Continue to keep G1 NO-GO pending required remaining gates.

## Auth aggregate comparison — 2026-11-02
- Operator's isolated local restoration query yielded `auth.users total=2, distinct_ids=2, email_confirmed=2`.
- Independently queried live Staging read-only with the same aggregate query and confirmed exactly `2,2,2`.
- Aggregate match is **PASS** but does not establish identity-level row equivalence, credential/session operation, or complete roles restore; G1 remains NO-GO until remaining acceptance gates.

## Recovery relational-integrity verification — 2026-11-02
- Operator reported the isolated local restore returned **zero** for all three checks: `orphan_memberships=0`, `orphan_branches=0`, `businesses_without_membership=0`.
- Independently ran the same read-only checks against Staging and confirmed all three returned **zero**, with no changes to Staging.
- PASS for these three relational checks only. This does not replace behavioral RLS verification, row identity equivalence, or repair/certification of the incomplete `roles.sql` restore. Keep G1 NO-GO until the remaining required checks pass.
