# Beger — verified implementation inventory and duplicate-work gate
Date: 2026-11-04. Scope: READ-ONLY platform inspection; no production mutation.

## Canonical ownership and evidence
- GitHub repository: `ultrablueai/Qmenu`; active integration branch: `feat/g1-foundation`, observed deployed commit `566bdefc308ed7da6276209bec7b7edf2419fa60`. `main` is *not* the working implementation baseline.
- Vercel preview project: `qmenu-staging`; deployment `dpl_E5SSjMnoWbFoaQRuQTU6JfW7N6Vj` READY for the above commit. READY is not evidence of authenticated browser/device acceptance.
- Supabase isolated Staging: `qandxrcuetwzenlqspez`, ACTIVE_HEALTHY. Inspected live migration history includes `g6_independent_pager`, `g6_pager_display_and_analytics`, `g7_branch_print_settings`, `g7_branch_staff_pager_access`, `g7_pager_audit_trail`, `g8_collection_close`, `g9_kitchen_staff_workstation`, `g10_branch_cashier`. Inspected public tables had RLS enabled, with 0 pager tickets and 0 cashier/kitchen assignments at audit time.
- Separate Supabase production reference: `fstpxknegaxppjilbnke` had **no migrations and no public tables** in the read-only inspection. Do not deploy there without separate owner approval.
- Source of product requirements: `docs/BEGER-CANONICAL-PLAN.md`, plus `docs/beger-pager-reference-20-images.md`. Prior `docs/BEGER-EXECUTION-BOARD.md` phase snapshot was dated 2026-11-01/03 and **must not be used alone** to claim modules are unbuilt. Existing snapshots remain as historical evidence.

## Module inventory — source and database, not commercial certification
| Stage | Existing source entrypoints | Database / evidence | Acceptance |
|---|---|---|---|
| G1 | `app/login/page.tsx`, `app/dashboard/page.tsx`, `app/admin/page.tsx` | business/branch membership, platform roles + RLS | independent browser/mobile signoff and recovery/security gates pending |
| G2 | `app/t/[token]/page.tsx`, `app/b/[branchId]/page.tsx`, `components/public-menu.tsx` | catalog, branch publications, table QR, themes | real guest/phone E2E pending |
| G3 | `components/guest-cart.tsx`, `components/guest-order-submission.tsx`, `app/dashboard/merchant-order-board.tsx` | `g3_orders`, `g3_order_items`, `g3_order_events` | multi-device actual-order signoff pending |
| G4 | `app/dashboard/merchant-report.tsx`, order printing components | `g3_payment_events`, branch reporting RPC | merchant-recorded collection only, no PSP settlement |
| G5 | `components/guest-order-rating.tsx`, `app/dashboard/merchant-loyalty.tsx` | `g5_order_ratings`, `g5_loyalty_stamps` | pilot only; never claim offers/redemption certified |
| G6 | `app/dashboard/merchant-pager.tsx`, `app/pager/[token]/pager-customer.tsx`, `app/pager/display/[token]/public-board.tsx` | `g6_pager_tickets`, `g6_pager_issue`, `g6_pager_transition`, public token RPC | database present, zero live tickets observed; full two-device test pending |
| G7 | `app/staff/pager/page.tsx`, `app/dashboard/merchant-pager-audit.tsx`, print settings | `g7_staff_branch_access`, `g7_pager_audit_events`, `g7_branch_print_settings` | physical printer and real staff tests pending |
| G8 | `app/dashboard/merchant-collection-close.tsx` | `g8_collection_closes`, `g8_collection_close` | real authorized close and negative tests pending; see `docs/BEGER-G8-STATUS.md` |
| G9 | `app/staff/kitchen/page.tsx`, `app/dashboard/merchant-kitchen.tsx` | `g9_kitchen_staff_branches`, kitchen events | no kitchen assignments observed; staff browser tests pending |
| G10 | `app/staff/cashier/page.tsx`, `app/dashboard/merchant-cashier.tsx`, `app/dashboard/merchant-cashier-access.tsx` | `g10_cashier_staff_branches`, `g10_cashier_order_action`, `g10_cashier_mark_collected`, `g10_cashier_assign` | no cashier assignments observed; real account/role and payment-record tests pending |

## Duplicate-work and Pager state conflict
- Existing G6 *already* stores independent tickets and atomically issues per-branch sequence numbers with unguessable customer links. Existing G6 uses `SELECT ... FOR UPDATE` and server-side role authorization; G7 adds staff permissions and audit history. Never replace with another ticket model without a migration and behavior contract.
- Branch `feat/pager-ticket-lifecycle`, draft PR #5, created in a later conversation, adds `src/lib/pager-ticket-lifecycle.mjs` and tests. **Do not merge as written.**
- Difference: PR #5 allows `ready -> cancelled`; live `g6_pager_transition(uuid,text)` on Staging permits `waiting -> preparing|ready|cancelled`, `preparing -> ready|cancelled`, `ready -> fulfilled`; terminal `fulfilled` and `cancelled` cannot move further. PR #5 also introduces a version field that does not exist in `g6_pager_tickets`. Duplicating these two state machines risks semantic drift.
- Action: keep PR #5 draft and unmerged; review any useful test ideas against existing `tests/beger-g6-independent-pager.test.mjs` and live SQL; implement only a verified gap in the current G6/G7 source.

## One-phase, no-duplication protocol (mandatory per conversation)
1. Read this inventory, `AGENTS.md`, canonical plan and most recent relevant status document.
2. Inspect actual branch SHA, pending PRs, existing frontend/server code, migrations, and Staging state **before writing**. Search by feature/RPC/table names. Mark existing functionality **REUSE**, missing **BUILD**, conflict **RECONCILE**, tested only by text assertion **NOT E2E**.
3. Pick one testable missing or broken vertical slice; write acceptance and negative tests. Never implement parallel feature models for a function already covered by G1–G10.
4. Keep work on scoped feature branches. PR review, test/build evidence, security review, then isolated staging acceptance; **no main merge/production writes without explicit approval**.
5. Report: exact commit/PR, files changed, tests executed (not merely added), real device/browser evidence, staging status, defects and next gate. Do not treat Vercel READY or a migration as a completed user journey.

## Next work after this inventory
- Reconcile PR #5 with G6 rather than merging duplicate lifecycle rules.
- Verify existing G6/G7/G9/G10 using independent actual staff accounts, multi-branch denial, customer QR on a second device, payment-record restrictions and no duplicate ready/fulfilled actions. No test fixture or auth identity should be silently created in real merchant accounts.
- Review 320px/Android/iOS layout and Arabic RTL / Turkish & English LTR; fix **specific** observed defects, no broad redesign before screenshot acceptance.
- Run `npm test && npm run build` on exact HEAD and record results. Guard real printer and Web Push claims behind physical-device evidence.
- Maintain `docs/BEGER-EXECUTION-BOARD.md` as chronological history while the inventory is the current working baseline. No commercial GO yet.


## 2026-11-04 — Pager duplication resolved
- PR #5 closed **without merge**. Historical commits retained; G6/G7 existing SQL remains authoritative.
- New test: `tests/beger-pager-authoritative-state.test.mjs` (commit `a5557eef`) checks allowed edges, branch access, row lock and G7 audit trigger. Its source patterns were inspected; full Node tests/build and browser E2E are still **unverified**.
- Next: run full suite on current branch and real staff/customer E2E; no production changes.

## 2026-11-04 — G9/G10 privilege hardening checkpoint

- Inspected live Staging PostgreSQL function privileges for 13 G9/G10 functions: all 13 returned `anon_execute = false`. Both internal `g9_kitchen_allowed` and `g10_cashier_allowed` also returned `auth_execute = false`; authenticated-facing RPCs had explicit authenticated EXECUTE. All inspected functions were SECURITY DEFINER with restricted search_path. This is **privilege inventory**, not complete exploit or real-user authorization proof.
- Reviewed `supabase/migrations/20261104194500_g9_kitchen_staff_workstation.sql` and `supabase/migrations/20261104231500_g10_branch_cashier.sql`: confirmed branch/business filters, row locks, constrained state edges and existing idempotent merchant-recorded collection (not PSP/bank settlement). No need to recreate workstations or tables.
- Added `tests/beger-g9-g10-privilege-boundary.test.mjs` in commit `a6b6d0aca2a08c2d861fa05ac9c999f8f00d4a12`. Five **static regression** tests guard public/anon EXECUTE revocations, minimal kitchen fields, branch guards, constrained transitions and existing cashier collection safety. File existence verified on GitHub; **no completed Node test run or Next build at that commit**, no CI statuses returned.
- Remaining: execute `npm test && npm run build` on the exact HEAD; conduct real authenticated independent kitchen/cashier staff sessions, deny cross-branch and cross-tenant calls, test simultaneous status/collection attempts and Android/iOS responsive views before any commercial GO.
- No schema alteration, no test identities/transactions created, no production change.

## 2026-11-04 — Cashier/kitchen failed-load UX fix
- Fixed `app/dashboard/merchant-cashier.tsx` and `app/dashboard/merchant-kitchen.tsx`: initial queue errors now stop the misleading "loading" message; a later successful queue fetch clears the earlier error. Existing authorization and RPC mutations are unchanged.
- Added `tests/beger-station-load-error-recovery.test.mjs` (2 tests parameterized over 2 workstations; 4 scenarios) at commit `69bb78fa09a300309afbac4a91dcaedbed846765`.
- Re-fetched all three changed files from GitHub and ran targeted source checks for failed-load state, error clearing, alert and retry: **pass**. This is source-level inspection, **not** `node --test`, typechecking, browser E2E, or a Vercel build.
- No new READY deployment or full CI result verified. No Production or database change. Next gate remains exact-HEAD `npm test && npm run build` and real browser/role tests.

## 2026-11-04 — Exact SHA staging validation attempt
- Deployment for commit `b8b83b3` was CANCELED *before tests* by the existing Vercel Ignored Build Step rule because its commit message lacked `[beger-deploy]`. This is the intended staging-only build throttle, not a test failure. Keep the gate enabled.
- This documentation commit carries the approved staging trigger marker solely to run the existing `npm test` and `next build` pipeline on current code, without any production changes. Record Vercel outcome separately after actual execution.

## 2026-11-04 — Employee station navigation and ready-order announcement (Staging only)

- User-reported guest order cycle was exercised; no independent authenticated employee/browser acceptance is claimed.
- Reused existing `g9_*` kitchen and `g10_*` cashier RPCs. `app/dashboard/merchant-staff.tsx` now exposes branch-linked entry points for cashier, kitchen and independent pager; these links do not grant permissions. Owners still assign already-registered staff using the existing role-scoped panels.
- `app/dashboard/merchant-cashier.tsx`: newly-ready orders from subsequent poll snapshots show a visible accessible announcement and call optional `useBegerFeedback` sound/vibration if enabled by the operator; baseline snapshot never rings for historical ready orders; unchanged ready orders are not repeated on polling. Cashier may manually repeat a ready order announcement via a button without changing DB status, payment or creating a G6 independent pager ticket. Existing guest-side `GuestOrderWatcher` still owns customer-ready order feedback; public G6 Pager board stays separate. This does not provide loudspeaker output, OS/background push, nor a shared public order-number board.
- CSS added for compact announcement and staff navigation at narrow widths. Test source `tests/beger-cashier-order-announcement.test.mjs` includes four static contract checks; real staff accounts/phone audio, background behavior and two-device verification are still pending.
- This documentation commit requests an isolated Staging test/build via existing `[beger-deploy]` guard; do not claim success unless Vercel run logs confirm.

### 2026-11-04 — First announcement build failure and corrected regression
- Vercel attempt `dpl_FVLu9K24yH1m9MYUB7FjMNQKgNK5` returned ERROR: 337/338 tests passed. The one failure was old static test `cashier clears a stale error once a later refresh succeeds`, which matched the previous `setOrders(data as Order[])` code literally. The announced-order refresh now stores the validated snapshot in `fresh`, then still executes `setLoaded(true);setError("")`.
- Updated `tests/beger-station-load-error-recovery.test.mjs` in commit `13080897` to assert both versions of the *correct* success behavior by station, not to skip or suppress the test.
- This commit triggers a fresh Staging validation with `[beger-deploy]`. Exact result is pending and must be read from Vercel logs.

### 2026-11-04 — Staff/Pager CSS compatibility
- Addressed observed Autoprefixer `align-items: end` warnings in `app/dashboard/merchant-staff.css` and `app/dashboard/merchant-pager.css` by replacing the ambiguous flex alignment with `flex-end`. No business, permissions, or data flow changes.
- Added `tests/beger-css-flex-alignment.test.mjs` with two source-contract checks to prevent recurrence.
- This exact-HEAD commit requests a Staging-only build using the existing `[beger-deploy]` guard. The actual automated-test and build results must be verified in Vercel before marking READY. No production changes.

### 2026-11-04 — Staff onboarding UX and pilot readiness
- Pilot Staging inspection found no assigned users in `g7_staff_branch_access`, `g9_kitchen_staff_branches`, or `g10_cashier_staff_branches` at check time. No staff accounts were created or role assignments were changed by the assistant.
- Updated `app/dashboard/merchant-staff.tsx` to present **one explicit role picker** for branch-scoped owner-managed grants. It reuses the already-applied G7/G9/G10 assignment RPCs rather than inventing new roles. Old per-role detail panels remain available for roster/revocation. Role changes refresh associated rosters.
- Updated `app/signup/page.tsx` so employees are told to register/verify their own email **without opening another business**, and use the assigned station; employer must grant that branch role.
- Added mobile layout `app/dashboard/merchant-staff.css` and test `tests/beger-staff-onboarding.test.mjs` with 4 static contract checks. Neither tests nor UI can prove real cross-account acceptance; to finish pilot, register independent employee accounts, confirm emails, assign roles as owner and test granted/denied stations on separate devices.
- This change is staging-only. The deployment commit bears `[beger-deploy]` to enter the existing guarded test/build pipeline, pending observed Vercel result.

- First staff-onboarding CI run `dpl_63Kf95dbDsyC88r3LCba24GMc4xs` failed 1 of 344 static tests: the new contract test assumed identical owner/manager rejection text for both pre-existing G9 and G10 SQL functions. SQL correctly protects privileged membership in both, but uses different equivalent error text. Corrected the test to check both known messages; did not weaken the authorization condition or modify database functions. Rechecking the entire pipeline at the next commit.

## 2026-11-04 — Employee misrouting from merchant onboarding
- Reproduced from source: `app/login/page.tsx` sent all authenticated identities to `/dashboard`; `app/dashboard/page.tsx` redirected accounts with no membership to `/onboarding`, confusing employees with new merchants. User screenshot confirms the symptom; no secret/access data used.
- Added `app/staff/page.tsx` as permission-checked employee landing. Its three existing RPCs discover assigned branches, including correct failure-closed behavior; never relies on email alone or grants access. Unassigned accounts get an explicit waiting-for-owner message; genuine new owners have an explicit link to create their business.
- Redirect only **unassigned and staff-only** accounts from dashboard to `/staff`. Mixed owner/manager memberships still use merchant dashboard. Existing G9/G10 assignment RPCs already insert `memberships(role='staff')` as needed and remain unchanged.
- Updated login language and documented post-verification navigation. Added `tests/beger-staff-login-routing.test.mjs` (4 tests). Real cross-account browser acceptance remains outstanding, with zero production changes.
- This entry triggers exact-HEAD isolated Staging validation `[beger-deploy]`, subject to observed test and build results. Stable alias: `qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app`.

### 2026-11-04 — Staff routing CI correction
- First validation for staff landing, deployment `dpl_8qwPea4VsvhbRRbpikzMZPNmyay5`, failed **one** old static test among 348. `tests/merchant-auth-routing.test.mjs` asserted legacy `/dashboard -> /onboarding` for membershipless accounts. That path is precisely the reported employee bug. Updated it to verify the new staff-only and unassigned access route rather than suppressing it. No change to server-side auth.
- Triggering a second Staging pipeline using `[beger-deploy]`. Do not claim ready until its real logs confirm success.

## 2026-11-05 — G11 employee registration separated from merchants
- Implemented `app/staff/register/page.tsx` as a **separate staff-only self-registration** entry point. Merchant signup remains at `/signup`. Neither page creates accounts on behalf of other people. Staff own their credentials and confirm email.
- Applied `supabase/migrations/20261105000500_g11_staff_pending_invitations.sql` to isolated Staging project `qandxrcuetwzenlqspez`, not production. Owner issues a role-specific, expiring (14-day) invitation using `g11_staff_invite`, which does **not** grant employee access. Verified employee sees their own invitations with `g11_my_invitations` and explicitly accepts via `g11_accept_invitation`, which atomically grants `staff` membership plus one existing G7/G9/G10 branch role. Owner may view/revoke a pending invitation; accepted role access is still revoked via existing station roster. Direct invitation table permissions revoked, RLS enabled.
- `app/dashboard/merchant-staff.tsx` now presents the pending invitation form and list; `app/staff/staff-invitations.tsx` shows a confirmed employee's pending invites. Authentication and all role checks remain in Supabase server-side RPCs. No external email is sent automatically; owner must share the fixed `/staff/register` URL. A recruiting/job-application marketplace is intentionally **not** shipped by this change.
- Verified live Staging RPC permissions: five `g11_*` functions deny `anon` EXECUTE and allow authenticated EXECUTE, with SECURITY DEFINER restricted search path and explicit owner/verified-user validation. RLS enabled; zero invitations at first verification. Observed one existing cashier assignment, left untouched.
- Added/updated static tests in `tests/beger-g11-staff-invitations.test.mjs`, `tests/beger-staff-onboarding.test.mjs` and `tests/beger-staff-login-routing.test.mjs`. The next commit requests exact-HEAD testing/build via the existing Staging-only deployment guard `[beger-deploy]`. No live multi-user invitation acceptance or real SMTP delivery test claimed.
